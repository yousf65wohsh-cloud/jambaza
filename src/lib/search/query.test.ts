import { describe, expect, it } from "vitest";

import { toCatalogSearchPattern } from "./query";

describe("toCatalogSearchPattern", () => {
  it("returns null for blank input", () => {
    expect(toCatalogSearchPattern("")).toBeNull();
    expect(toCatalogSearchPattern("   ")).toBeNull();
  });

  it("trims and collapses whitespace", () => {
    expect(toCatalogSearchPattern("  ليلى   هادئة  ")).toBe("ليلى هادئة");
  });

  it("replaces PostgREST separators with spaces", () => {
    expect(toCatalogSearchPattern("ليلى,هادئة")).toBe("ليلى هادئة");
    expect(toCatalogSearchPattern("(ليلى)")).toBe("ليلى");
  });
});
