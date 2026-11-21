import { describe, expect, it } from "vitest";

import { DEFAULT_NAV_SIDE, parseNavSide } from "./navSide";

describe("parseNavSide", () => {
  it("accepts the left edge", () => {
    expect(parseNavSide("left")).toBe("left");
  });

  it("accepts the right edge", () => {
    expect(parseNavSide("right")).toBe("right");
  });

  it("falls back to the default for null", () => {
    expect(parseNavSide(null)).toBe(DEFAULT_NAV_SIDE);
  });

  it("falls back to the default for undefined", () => {
    expect(parseNavSide(undefined)).toBe(DEFAULT_NAV_SIDE);
  });

  it("falls back to the default for an invalid string", () => {
    expect(parseNavSide("center")).toBe(DEFAULT_NAV_SIDE);
  });
});
