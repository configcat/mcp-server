import { describe, expect, it } from "vitest";
import { appendQueryParams, buildQueryString } from "../../src/helpers/query-params.js";

describe("buildQueryString", () => {
  it("returns an empty string when there are no query params", () => {
    expect(buildQueryString({})).toBe("");
  });

  it("skips null values", () => {
    expect(buildQueryString({ reason: null })).toBe("");
  });

  it("serializes string query params", () => {
    expect(buildQueryString({ reason: "Enable flag for testing" })).toBe("reason=Enable+flag+for+testing");
  });

  it("serializes boolean and number query params", () => {
    expect(buildQueryString({ cleanupAuditLogs: true, staleFlagAgeDays: 30 })).toBe("cleanupAuditLogs=true&staleFlagAgeDays=30");
  });

  it("serializes array query params as repeated keys", () => {
    expect(buildQueryString({ ignoredEnvironmentIds: ["env-1", "env-2"] })).toBe("ignoredEnvironmentIds=env-1&ignoredEnvironmentIds=env-2");
  });
});

describe("appendQueryParams", () => {
  it("returns the original path when there are no query params", () => {
    const path = "/v2/environments/env-id/settings/123/value";
    expect(appendQueryParams(path, {})).toBe(path);
  });

  it("appends query params to the path", () => {
    const path = "/v2/environments/env-id/settings/123/value";
    expect(appendQueryParams(path, { reason: "Testing change" })).toBe("/v2/environments/env-id/settings/123/value?reason=Testing+change");
  });
});
