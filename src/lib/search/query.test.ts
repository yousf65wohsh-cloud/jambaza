import { describe, expect, it } from "vitest";

import { normalizeQuery, toCatalogSearchPattern } from "./query";

describe("normalizeQuery", () => {
  it("returns normal text unchanged", () => {
    expect(normalizeQuery("midnight")).toBe("midnight");
  });

  it("returns Arabic text unchanged", () => {
    expect(normalizeQuery("ليلى")).toBe("ليلى");
  });

  it("returns null for whitespace only", () => {
    expect(normalizeQuery("")).toBeNull();
    expect(normalizeQuery("   ")).toBeNull();
    expect(normalizeQuery("\t\n")).toBeNull();
  });

  it("trims surrounding spaces", () => {
    expect(normalizeQuery("  ليلى هادئة  ")).toBe("ليلى هادئة");
  });
});

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
