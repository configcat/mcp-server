import { InvalidTokenError, ServerError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import type { OAuthServerConfig } from "../runtime-config.js";

const timestampSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const introspectionSchema = z.object({
  active: z.literal(true),
  ["client_id"]: z.string().min(1),
  sub: z.string().min(1),
  iss: z.string().min(1),
  aud: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]),
  ["token_usage"]: z.string(),
  ["token_type"]: z.string(),
  scope: z.string().optional(),
  exp: timestampSchema,
  nbf: timestampSchema.optional(),
});

export async function verifyAccessToken(
  token: string,
  config: OAuthServerConfig,
  resource: URL
): Promise<AuthInfo> {
  const body = new URLSearchParams({ token });
  body.set("token_type_hint", "access_token");
  if (config.introspection.clientId) {
    body.set("client_id", config.introspection.clientId);
  }
  if (config.introspection.clientSecret) {
    body.set("client_secret", config.introspection.clientSecret);
  }

  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(config.introspection.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!response.ok) {
      console.error(`OAuth token introspection failed: HTTP ${response.status}`);
      throw new ServerError(`OAuth token introspection failed: HTTP ${response.status}`);
    }
    payload = await response.json();
  } catch {
    console.error("OAuth token introspection is unavailable.");
    throw new ServerError("OAuth token introspection is unavailable.");
  }

  const status = z.object({ active: z.boolean() }).safeParse(payload);
  if (!status.success) {
    console.error("Invalid OAuth token introspection response.");
    throw new ServerError("Invalid OAuth token introspection response.");
  }
  if (!status.data.active) {
    console.error("Token is inactive.");
    throw new InvalidTokenError("Token is inactive.");
  }

  const result = introspectionSchema.safeParse(payload);
  if (!result.success) {
    console.error("Invalid OAuth token introspection response.");
    throw new ServerError("Invalid OAuth token introspection response.");
  }
  const data = result.data;
  const audiences = typeof data.aud === "string" ? [data.aud] : data.aud;
  if (!audiences.includes(resource.href)) {
    console.error("Token is not intended for this MCP server.");
    throw new InvalidTokenError("Token is not intended for this MCP server.");
  }
  if (data.iss !== config.metadata.issuer) {
    console.error("Unexpected token issuer.");
    throw new InvalidTokenError("Unexpected token issuer.");
  }
  if (data.token_usage !== "access_token" || data.token_type !== "Bearer") {
    console.error("A Bearer access token is required.");
    throw new InvalidTokenError("A Bearer access token is required.");
  }
  if (typeof data.nbf === "number" && data.nbf > Date.now() / 1000) {
    console.error("Token is not yet valid.");
    throw new InvalidTokenError("Token is not yet valid.");
  }

  return {
    token,
    clientId: data.client_id,
    scopes: data.scope ? data.scope.split(/\s+/).filter(Boolean) : [],
    expiresAt: data.exp,
    resource,
    extra: { issuer: data.iss, subject: data.sub },
  };
}

export function getSessionIdentity(auth: AuthInfo | undefined): string | undefined {
  if (!auth || typeof auth.extra?.issuer !== "string" || typeof auth.extra.subject !== "string") {
    return;
  }
  return JSON.stringify([auth.extra.issuer, auth.extra.subject, auth.clientId]);
}
