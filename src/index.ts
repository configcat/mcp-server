#!/usr/bin/env node

import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { getOAuthProtectedResourceMetadataUrl, mcpAuthMetadataRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { checkResourceAllowed } from "@modelcontextprotocol/sdk/shared/auth-utils.js";
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { HttpClient } from "./http.js";
import { getHttpServerConfig, getOAuthServerConfig, resolveServerMode } from "./runtime-config.js";
import { registerConfigCatAPITools } from "./tools/configcat-api.js";
import { registerConfigCatDocsTools } from "./tools/configcat-docs.js";

const serverName = "ConfigCat MCP";
const serverVersion = "0.1.10";

const http = new HttpClient(`${serverName}/${serverVersion}`);

type SessionContext = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

async function createServer(): Promise<McpServer> {
  const server = new McpServer(
    { name: serverName, version: serverVersion },
    { capabilities: { tools: {} } }
  );

  registerConfigCatAPITools(server, http);
  await registerConfigCatDocsTools(server, http);

  return server;
}

async function runStdio(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function buildOAuthMetadata(config: ReturnType<typeof getOAuthServerConfig>): OAuthMetadata {
  const metadata = {
    issuer: config.metadata.issuer,
  } as OAuthMetadata;

  metadata["authorization_endpoint"] = config.metadata.authorizationEndpoint;
  metadata["token_endpoint"] = config.metadata.tokenEndpoint;
  metadata["introspection_endpoint"] = config.metadata.introspectionEndpoint;
  metadata["response_types_supported"] = config.metadata.responseTypesSupported;
  metadata["grant_types_supported"] = config.metadata.grantTypesSupported;
  metadata["token_endpoint_auth_methods_supported"] = config.metadata.tokenEndpointAuthMethodsSupported;
  metadata["scopes_supported"] = config.metadata.scopesSupported;

  if (config.metadata.registrationEndpoint) {
    metadata["registration_endpoint"] = config.metadata.registrationEndpoint;
  }

  return metadata;
}

function runHttp(): void {
  const httpConfig = getHttpServerConfig(process.env);
  const oauthConfig = getOAuthServerConfig(process.env);
  const oauthMetadata = buildOAuthMetadata(oauthConfig);

  const app = createMcpExpressApp({
    host: httpConfig.host,
    allowedHosts: httpConfig.allowedHosts,
  });

  app.use(mcpAuthMetadataRouter({
    oauthMetadata,
    resourceServerUrl: httpConfig.endpointUrl,
    scopesSupported: oauthConfig.metadata.scopesSupported,
    resourceName: serverName,
  }));

  const authMiddleware = requireBearerAuth({
    verifier: {
      verifyAccessToken: async (token: string) => {
        const body = new URLSearchParams({ token });
        if (oauthConfig.introspection.clientId) {
          body.set("client_id", oauthConfig.introspection.clientId);
        }
        if (oauthConfig.introspection.clientSecret) {
          body.set("client_secret", oauthConfig.introspection.clientSecret);
        }

        const response = await fetch(oauthConfig.introspection.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`OAuth token introspection failed: HTTP ${response.status} ${response.statusText} ${text}`);
        }

        const data = await response.json() as {
          active?: boolean;
          clientId?: string;
          scope?: string;
          exp?: number;
          aud?: string | string[];
          [key: string]: unknown;
        };

        const tokenClientId = typeof data["client_id"] === "string"
          ? data["client_id"]
          : (data.clientId ?? "unknown-client");

        if (data.active !== true) {
          throw new InvalidTokenError("Token is inactive.");
        }

        const audiences = Array.isArray(data.aud)
          ? data.aud
          : (typeof data.aud === "string" && data.aud ? [data.aud] : []);

        if (oauthConfig.resourceEnforcement) {
          if (audiences.length === 0) {
            throw new InvalidTokenError("Resource indicator is missing from token introspection response.");
          }

          const matches = audiences.some(aud => checkResourceAllowed({
            requestedResource: aud,
            configuredResource: httpConfig.endpointUrl,
          }));

          if (!matches) {
            throw new InvalidTokenError(`Token resource does not match ${httpConfig.endpointUrl.toString()}.`);
          }
        }

        return {
          token,
          clientId: tokenClientId,
          scopes: data.scope ? data.scope.split(/\s+/).filter(Boolean) : [],
          expiresAt: data.exp,
          ...(audiences[0] ? { resource: new URL(audiences[0]) } : {}),
        };
      },
    },
    requiredScopes: oauthConfig.requiredScopes,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(httpConfig.endpointUrl),
  });

  const sessions = new Map<string, SessionContext>();

  app.post(httpConfig.path, authMiddleware, async (req: Request, res: Response) => {
    try {
      const sessionIdHeader = req.header("mcp-session-id");
      const parsedBody = req.body as unknown;

      if (sessionIdHeader) {
        const existing = sessions.get(sessionIdHeader);
        if (!existing) {
          res.status(404).send("Session not found.");
          return;
        }

        await existing.transport.handleRequest(req, res, parsedBody);
        return;
      }

      if (!isInitializeRequest(parsedBody)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: Missing or invalid MCP session ID.",
          },
          id: null,
        });
        return;
      }

      const server = await createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: sessionId => {
          sessions.set(sessionId, { server, transport });
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) {
          sessions.delete(sid);
        }

        void server.close();
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      console.error("Error handling MCP POST request", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error.",
          },
          id: null,
        });
      }
    }
  });

  const handleSessionRequest = async (req: Request, res: Response): Promise<void> => {
    const sessionIdHeader = req.header("mcp-session-id");
    const parsedBody = req.body as unknown;

    if (!sessionIdHeader) {
      res.status(400).send("Missing MCP session ID.");
      return;
    }

    const existing = sessions.get(sessionIdHeader);
    if (!existing) {
      res.status(404).send("Session not found.");
      return;
    }

    await existing.transport.handleRequest(req, res, parsedBody);
  };

  app.get(httpConfig.path, authMiddleware, async (req: Request, res: Response) => {
    try {
      await handleSessionRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP GET request", error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error.");
      }
    }
  });

  app.delete(httpConfig.path, authMiddleware, async (req: Request, res: Response) => {
    try {
      await handleSessionRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP DELETE request", error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error.");
      }
    }
  });

  const listener = app.listen(httpConfig.port, httpConfig.host, () => {
    console.error(`ConfigCat MCP HTTP server listening on ${httpConfig.host}:${httpConfig.port}${httpConfig.path}`);
  });

  process.on("SIGINT", () => {
    void (async () => {
      listener.close();
      for (const [, session] of sessions) {
        await session.transport.close().catch(() => null);
        await session.server.close().catch(() => null);
      }
      sessions.clear();
      process.exit(0);
    })();
  });
}

async function main() {
  const mode = resolveServerMode(process.argv);

  if (mode === "http") {
    runHttp();
    return;
  }

  await runStdio();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
