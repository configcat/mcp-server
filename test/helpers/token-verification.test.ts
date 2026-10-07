import { InvalidTokenError, ServerError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import type { Response as ExpressResponse, Request } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSessionIdentity, verifyAccessToken } from "../../src/helpers/token-verification.js";
import { getOAuthServerConfig } from "../../src/runtime-config.js";

const config = getOAuthServerConfig({
  MCP_OAUTH_ISSUER: "https://auth.example.com",
  MCP_OAUTH_INTROSPECTION_CLIENT_ID: "mcp-resource-server",
  MCP_OAUTH_INTROSPECTION_CLIENT_SECRET: "test-secret",
});
const resource = new URL("https://mcp.example.com/mcp");
const validPayload = {
  active: true,
  ["client_id"]: "client-a",
  sub: "user-a",
  iss: config.metadata.issuer,
  aud: resource.href,
  ["token_usage"]: "access_token",
  ["token_type"]: "Bearer",
  scope: "public_api openid",
  exp: Math.floor(Date.now() / 1000) + 3600,
};

function mockIntrospection(payload: unknown) {
  return vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyAccessToken", () => {
  it("accepts an MCP access token issued to a different client than the introspection caller", async () => {
    mockIntrospection(validPayload);
    const auth = await verifyAccessToken("access-token", config, resource);
    expect(auth).toMatchObject({
      token: "access-token",
      clientId: "client-a",
      scopes: ["public_api", "openid"],
      expiresAt: validPayload.exp,
      extra: { issuer: config.metadata.issuer, subject: "user-a" },
    });
    expect(fetch).toHaveBeenCalledWith(config.introspection.endpoint, expect.objectContaining({
      redirect: "error",
      signal: expect.any(AbortSignal),
    }));
    const init = vi.mocked(fetch).mock.calls[0][1]!;
    const body = new URLSearchParams(init.body as string);
    expect(body.get("client_id")).toBe("mcp-resource-server");
    expect(body.get("client_secret")).toBe("test-secret");
    expect(body.get("token_type_hint")).toBe("access_token");
  });

  it("accepts an audience array containing the MCP resource", async () => {
    mockIntrospection({ ...validPayload, aud: ["another-resource", resource.href] });
    await expect(verifyAccessToken("token", config, resource)).resolves.toBeDefined();
  });

  it("rejects inactive tokens without requiring additional claims", async () => {
    mockIntrospection({ active: false });
    await expect(verifyAccessToken("token", config, resource)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it.each([
    { aud: "https://api.example.com" },
    { iss: "https://other-issuer.example.com" },
    { ["token_usage"]: "refresh_token" },
    { ["token_type"]: "DPoP" },
    { nbf: Math.floor(Date.now() / 1000) + 3600 },
  ])("rejects an unauthorized token: %j", async override => {
    mockIntrospection({ ...validPayload, ...override });
    await expect(verifyAccessToken("token", config, resource)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it.each([
    { active: "true" },
    { aud: void 0 },
    { aud: [resource.href, 42] },
    { scope: ["public_api"] },
    { exp: "123" },
    { exp: 1.5 },
    { exp: void 0 },
    { nbf: "123" },
    { sub: void 0 },
    { ["client_id"]: void 0 },
  ])("fails closed on malformed responses: %j", async override => {
    mockIntrospection({ ...validPayload, ...override });
    await expect(verifyAccessToken("token", config, resource)).rejects.toBeInstanceOf(ServerError);
  });

  it("always returns the verified MCP resource", async () => {
    mockIntrospection(validPayload);
    await expect(verifyAccessToken("token", config, resource))
      .resolves.toHaveProperty("resource", resource);
  });

  it.each([401, 500, 302])("fails closed on HTTP %s without exposing the response body", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive details", { status })));
    await expect(verifyAccessToken("token", config, resource))
      .rejects.toThrow("OAuth token introspection is unavailable.");
  });

  it.each(["TimeoutError", "TypeError"])("fails closed on fetch failure: %s", async name => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("sensitive details", name)));
    await expect(verifyAccessToken("token", config, resource)).rejects.toBeInstanceOf(ServerError);
  });

  it("fails closed on invalid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not JSON")));
    await expect(verifyAccessToken("token", config, resource)).rejects.toBeInstanceOf(ServerError);
  });
});

describe("getSessionIdentity", () => {
  it("allows token refresh but distinguishes subjects, issuers and clients", async () => {
    mockIntrospection(validPayload);
    const auth = await verifyAccessToken("old-token", config, resource);
    const identity = getSessionIdentity(auth);
    expect(identity).toBeDefined();
    expect(getSessionIdentity({ ...auth, token: "new-token" })).toBe(identity);
    expect(getSessionIdentity({ ...auth, clientId: "client-b" })).not.toBe(identity);
    expect(getSessionIdentity({ ...auth, extra: { ...auth.extra, subject: "user-b" } })).not.toBe(identity);
    expect(getSessionIdentity({ ...auth, extra: { ...auth.extra, issuer: "other-issuer" } })).not.toBe(identity);
    expect(getSessionIdentity(void 0)).toBeUndefined();
    expect(getSessionIdentity({ ...auth, extra: {} })).toBeUndefined();
  });
});

describe("HTTP bearer authentication", () => {
  it.each([
    { override: {}, status: null },
    { override: { exp: Math.floor(Date.now() / 1000) - 60 }, status: 401 },
    { override: { scope: "openid" }, status: 403 },
    { override: { scope: void 0 }, status: 403 },
    { override: { aud: "another-resource" }, status: 401 },
  ])("enforces token validation, expiry and scopes: %j", async ({ override, status }) => {
    mockIntrospection({ ...validPayload, ...override });
    const middleware = requireBearerAuth({
      verifier: { verifyAccessToken: token => verifyAccessToken(token, config, resource) },
      requiredScopes: config.requiredScopes,
    });
    const request = { headers: { authorization: "Bearer token" } } as Request;
    const response = {
      status: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();
    await middleware(request, response as unknown as ExpressResponse, next);
    if (status === null) {
      expect(next).toHaveBeenCalledOnce();
      expect(getSessionIdentity(request.auth)).toBeDefined();
    } else {
      expect(response.status).toHaveBeenCalledWith(status);
      expect(next).not.toHaveBeenCalled();
    }
  });
});

describe("OAuth server configuration", () => {
  it.each([
    { issuer: "https://auth.example.com", base: "https://auth.example.com" },
    { issuer: "https://auth.example.com/", base: "https://auth.example.com" },
    { issuer: "https://auth.example.com/tenant", base: "https://auth.example.com/tenant" },
    { issuer: "https://auth.example.com/tenant/", base: "https://auth.example.com/tenant" },
  ])("builds endpoints without changing the issuer: $issuer", ({ issuer, base }) => {
    const oauthConfig = getOAuthServerConfig({
      MCP_OAUTH_ISSUER: issuer,
      MCP_OAUTH_INTROSPECTION_CLIENT_ID: "mcp-server",
      MCP_OAUTH_INTROSPECTION_CLIENT_SECRET: "test-secret",
    });
    expect(oauthConfig.metadata.issuer).toBe(issuer);
    expect(oauthConfig.metadata.authorizationEndpoint).toBe(`${base}/oauth/authorize`);
    expect(oauthConfig.metadata.tokenEndpoint).toBe(`${base}/oauth/token`);
    expect(oauthConfig.metadata.introspectionEndpoint).toBe(`${base}/oauth/introspect`);
    expect(oauthConfig.introspection.endpoint).toBe(`${base}/oauth/introspect`);
  });

  it.each(["MCP_OAUTH_INTROSPECTION_CLIENT_ID", "MCP_OAUTH_INTROSPECTION_CLIENT_SECRET"])(
    "requires %s at startup", name => {
      const env = {
        MCP_OAUTH_ISSUER: "https://auth.example.com",
        MCP_OAUTH_INTROSPECTION_CLIENT_ID: "mcp-server",
        MCP_OAUTH_INTROSPECTION_CLIENT_SECRET: "test-secret",
        [name]: "",
      };
      expect(() => getOAuthServerConfig(env)).toThrow(`Missing required environment variable: ${name}`);
    }
  );

  it("requires public_api by default but preserves explicit scope configuration", () => {
    const env = {
      MCP_OAUTH_ISSUER: "https://auth.example.com",
      MCP_OAUTH_INTROSPECTION_CLIENT_ID: "mcp-server",
      MCP_OAUTH_INTROSPECTION_CLIENT_SECRET: "test-secret",
    };
    expect(getOAuthServerConfig(env).requiredScopes).toEqual(["public_api"]);
    expect(getOAuthServerConfig({ ...env, MCP_OAUTH_REQUIRED_SCOPES: "custom_scope" }).requiredScopes)
      .toEqual(["custom_scope"]);
  });
});
