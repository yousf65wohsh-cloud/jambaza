import { describe, expect, it } from "vitest";

import {
  MAX_DISPLAY_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeDisplayName,
  validateDisplayName,
  validateNewPassword,
} from "./validation";

describe("normalizeDisplayName", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeDisplayName("  ليلى   محمد  ")).toBe("ليلى محمد");
  });

  it("returns null for an empty or whitespace-only value", () => {
    expect(normalizeDisplayName("")).toBeNull();
    expect(normalizeDisplayName("   ")).toBeNull();
  });
});

describe("validateDisplayName", () => {
  it("accepts an empty value (display name is optional)", () => {
    expect(validateDisplayName("")).toEqual({ ok: true });
  });

  it("accepts a name at the maximum length", () => {
    expect(validateDisplayName("ا".repeat(MAX_DISPLAY_NAME_LENGTH))).toEqual({
      ok: true,
    });
  });

  it("rejects a name longer than the maximum with an Arabic message", () => {
    const result = validateDisplayName("ا".repeat(MAX_DISPLAY_NAME_LENGTH + 1));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("الاسم المعروض");
    }
  });
});

describe("validateNewPassword", () => {
  it("rejects a password shorter than the minimum", () => {
    const result = validateNewPassword("ا".repeat(MIN_PASSWORD_LENGTH - 1));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("كلمة المرور");
      expect(result.message).toContain(String(MIN_PASSWORD_LENGTH));
    }
  });

  it("accepts a password at the minimum length", () => {
    expect(validateNewPassword("ا".repeat(MIN_PASSWORD_LENGTH))).toEqual({
      ok: true,
    });
  });

  it("accepts a longer password", () => {
    expect(validateNewPassword("secret-password-123")).toEqual({ ok: true });
  });
});
