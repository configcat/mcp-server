export type ServerMode = "stdio" | "http";

export interface HttpServerConfig {
  host: string;
  port: number;
  path: string;
  allowedHosts?: string[];
  publicBaseUrl: URL;
  endpointUrl: URL;
}

export interface OAuthServerConfig {
  metadata: {
    issuer: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    introspectionEndpoint: string;
    responseTypesSupported: string[];
    grantTypesSupported: string[];
    tokenEndpointAuthMethodsSupported: string[];
    scopesSupported: string[];
    registrationEndpoint?: string;
  };
  requiredScopes: string[];
  introspection: {
    endpoint: string;
    clientId: string;
    clientSecret: string;
  };
}

function getRequiredEnv(name: string, env: NodeJS.ProcessEnv): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeMcpPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") {
    return "/mcp";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 3000;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid MCP_HTTP_PORT value: ${value}. Expected an integer in the range 1-65535.`);
  }

  return parsed;
}

export function resolveServerMode(argv: string[]): ServerMode {
  const requestedMode = argv[2];
  if (!requestedMode) {
    return "stdio";
  }

  if (requestedMode === "stdio" || requestedMode === "http") {
    return requestedMode;
  }

  throw new Error(`Unknown mode: ${requestedMode}. Use one of: stdio, http.`);
}

export function getHttpServerConfig(env: NodeJS.ProcessEnv): HttpServerConfig {
  const host = env.MCP_HTTP_HOST ?? "127.0.0.1";
  const port = parsePort(env.MCP_HTTP_PORT);
  const path = normalizeMcpPath(env.MCP_HTTP_PATH ?? "/mcp");
  const allowedHosts = parseCsv(env.MCP_HTTP_ALLOWED_HOSTS);
  const publicBaseUrl = new URL(env.MCP_HTTP_PUBLIC_BASE_URL ?? `http://${host}:${port}`);
  const endpointUrl = new URL(path, publicBaseUrl);

  const config: HttpServerConfig = {
    host,
    port,
    path,
    publicBaseUrl,
    endpointUrl,
  };

  if (allowedHosts.length > 0) {
    config.allowedHosts = allowedHosts;
  }

  return config;
}

export function getOAuthServerConfig(env: NodeJS.ProcessEnv): OAuthServerConfig {
  const scopes = parseCsv(env.MCP_OAUTH_SCOPES ?? "public_api,offline_access,openid");
  const requiredScopes = parseCsv(env.MCP_OAUTH_REQUIRED_SCOPES ?? "public_api");
  const issuer = getRequiredEnv("MCP_OAUTH_ISSUER", env);
  const endpointBaseUrl = new URL(issuer);
  if (!endpointBaseUrl.pathname.endsWith("/")) {
    endpointBaseUrl.pathname += "/";
  }
  const introspectionEndpoint = new URL("oauth/introspect", endpointBaseUrl).href;

  const config: OAuthServerConfig = {
    metadata: {
      issuer: issuer,
      authorizationEndpoint: new URL("oauth/authorize", endpointBaseUrl).href,
      tokenEndpoint: new URL("oauth/token", endpointBaseUrl).href,
      introspectionEndpoint,
      responseTypesSupported: ["code"],
      grantTypesSupported: ["authorization_code", "refresh_token"],
      tokenEndpointAuthMethodsSupported: ["client_secret_post", "none"],
      scopesSupported: scopes,
    },
    requiredScopes,
    introspection: {
      endpoint: introspectionEndpoint,
      clientId: getRequiredEnv("MCP_OAUTH_INTROSPECTION_CLIENT_ID", env),
      clientSecret: getRequiredEnv("MCP_OAUTH_INTROSPECTION_CLIENT_SECRET", env),
    },
  };

  return config;
}
