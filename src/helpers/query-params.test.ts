import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appendQueryParams, buildQueryString } from "./query-params.js";

describe("buildQueryString", () => {
  it("returns an empty string when there are no query params", () => {
    assert.equal(buildQueryString({}), "");
  });

  it("skips null values", () => {
    assert.equal(buildQueryString({ reason: null }), "");
  });

  it("serializes string query params", () => {
    assert.equal(
      buildQueryString({ reason: "Enable flag for testing" }),
      "reason=Enable+flag+for+testing"
    );
  });

  it("serializes boolean and number query params", () => {
    assert.equal(
      buildQueryString({ cleanupAuditLogs: true, staleFlagAgeDays: 30 }),
      "cleanupAuditLogs=true&staleFlagAgeDays=30"
    );
  });

  it("serializes array query params as repeated keys", () => {
    assert.equal(
      buildQueryString({ ignoredEnvironmentIds: ["env-1", "env-2"] }),
      "ignoredEnvironmentIds=env-1&ignoredEnvironmentIds=env-2"
    );
  });
});

describe("appendQueryParams", () => {
  it("returns the original path when there are no query params", () => {
    const path = "/v2/environments/env-id/settings/123/value";
    assert.equal(appendQueryParams(path, {}), path);
  });

  it("appends query params to the path", () => {
    const path = "/v2/environments/env-id/settings/123/value";
    assert.equal(
      appendQueryParams(path, { reason: "Testing change" }),
      "/v2/environments/env-id/settings/123/value?reason=Testing+change"
    );
  });
});
