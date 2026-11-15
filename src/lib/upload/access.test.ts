import { describe, expect, it } from "vitest";

import { canUpload } from "./access";

describe("canUpload", () => {
  it("denies listeners", () => {
    expect(canUpload("listener")).toBe(false);
  });

  it("allows artists", () => {
    expect(canUpload("artist")).toBe(true);
  });

  it("allows admins", () => {
    expect(canUpload("admin")).toBe(true);
  });

  it("denies when the role is missing", () => {
    expect(canUpload(null)).toBe(false);
    expect(canUpload(undefined)).toBe(false);
  });
});
