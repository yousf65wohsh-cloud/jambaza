// TEMP-DEBUG: temporary upload diagnostics. Remove this file with the feature.

import { describe, expect, it } from "vitest";

import { describeError } from "./uploadDebug";

describe("describeError", () => {
  it("returns only whitelisted fields and drops token, key, and url", () => {
    const result = describeError({
      name: "StorageApiError",
      message: "upload failed",
      code: "403",
      details: "new row violates row-level security policy",
      hint: "check the storage policy",
      status: 403,
      statusCode: 403,
      token: "should-not-appear",
      key: "should-not-appear",
      url: "https://example.invalid/should-not-appear",
      extra: { nested: true },
    });

    expect(result).toEqual({
      name: "StorageApiError",
      message: "upload failed",
      code: "403",
      details: "new row violates row-level security policy",
      hint: "check the storage policy",
      status: 403,
      statusCode: 403,
    });
    expect(Object.keys(result).sort()).toEqual(
      ["code", "details", "hint", "message", "name", "status", "statusCode"].sort(),
    );
    expect(result).not.toHaveProperty("token");
    expect(result).not.toHaveProperty("key");
    expect(result).not.toHaveProperty("url");
    expect(result).not.toHaveProperty("extra");
    expect(JSON.stringify(result)).not.toContain("should-not-appear");
  });

  it("describes nested error and cause objects with allowed fields only", () => {
    const nested = {
      name: "PostgrestError",
      message: "permission denied for table tracks",
      code: "42501",
      details: "RLS blocked the insert",
      hint: "check the tracks policy",
      token: "should-not-appear",
      url: "https://example.invalid/should-not-appear",
    };

    const viaError = describeError({ name: "AppError", message: "outer", error: nested });
    expect(viaError.error).toEqual({
      name: "PostgrestError",
      message: "permission denied for table tracks",
      code: "42501",
      details: "RLS blocked the insert",
      hint: "check the tracks policy",
    });

    const viaCause = describeError({ name: "AppError", message: "outer", cause: nested });
    expect(viaCause.error).toEqual(viaError.error);
    expect(JSON.stringify(viaCause)).not.toContain("should-not-appear");
  });

  it("handles primitive and empty values safely", () => {
    expect(describeError("boom")).toEqual({ message: "boom" });
    expect(describeError(42)).toEqual({ message: "42" });
    expect(describeError(null)).toEqual({});
    expect(describeError(undefined)).toEqual({});
  });
});
