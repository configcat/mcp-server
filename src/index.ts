#!/usr/bin/env node

import { createMcpExpressApp, getOAuthProtectedResourceMetadataUrl, mcpAuthMetadataRouter, requireBearerAuth } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer, type OAuthMetadata } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import type { Request, Response } from "express";
import { verifyAccessToken } from "./helpers/token-verification.js";
import { HttpClient } from "./http.js";
import { getHttpServerConfig, getOAuthServerConfig, resolveServerMode } from "./runtime-config.js";
import { registerConfigCatAPITools } from "./tools/configcat-api.js";
import { registerConfigCatDocsTools } from "./tools/configcat-docs.js";

const serverName = "ConfigCat MCP";
const serverVersion = "0.1.11";

const serverMode = resolveServerMode(process.argv);

const http = new HttpClient(`${serverName}/${serverVersion} (${serverMode})`);

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
  // Disable the "X-Powered-By" header for security reasons.
  app.disable("x-powered-by");

  // Unauthenticated health check for load balancers. It reports that this process is up.
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(mcpAuthMetadataRouter({
    oauthMetadata,
    resourceServerUrl: httpConfig.endpointUrl,
    scopesSupported: oauthConfig.metadata.scopesSupported,
    resourceName: serverName,
  }));

  const authMiddleware = requireBearerAuth({
    verifier: {
      verifyAccessToken: token => verifyAccessToken(token, oauthConfig, httpConfig.endpointUrl),
    },
    requiredScopes: oauthConfig.requiredScopes,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(httpConfig.endpointUrl),
  });

  const onerror = (error: Error): void => {
    console.error("Error handling MCP request", error);
  };
  const handler = createMcpHandler(createServer, { onerror });
  const nodeHandler = toNodeHandler(handler, { onerror });

  app.all(httpConfig.path, authMiddleware, (req: Request, res: Response) => {
    void nodeHandler(req, res, req.body as unknown);
  });

  const listener = app.listen(httpConfig.port, httpConfig.host, () => {
    console.error(`ConfigCat MCP HTTP server listening on ${httpConfig.host}:${httpConfig.port}${httpConfig.path}`);
  });

  const SHUTDOWN_TIMEOUT_MS = 10_000;
  const shutdown = async (): Promise<void> => {
    const forceExit = setTimeout(() => {
      console.error("Shutdown timed out, forcing remaining connections closed");
      listener.closeAllConnections();
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      const drained = new Promise<void>(resolve => listener.close(() => resolve()));
      await handler.close();
      await drained;
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown", err);
      process.exit(1);
    }
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

async function main() {
  if (serverMode === "http") {
    runHttp();
    return;
  }

  await runStdio();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
