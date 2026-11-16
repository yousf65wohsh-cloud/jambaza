import { describe, expect, it } from "vitest";

import { nextPosition } from "./position";

describe("nextPosition", () => {
  it("starts at 0 for an empty playlist", () => {
    expect(nextPosition([])).toBe(0);
  });

  it("appends after a single position", () => {
    expect(nextPosition([0])).toBe(1);
  });

  it("appends after the last contiguous position", () => {
    expect(nextPosition([0, 1, 2])).toBe(3);
  });

  it("uses the maximum instead of assuming sorted input", () => {
    expect(nextPosition([3, 0, 2])).toBe(4);
  });

  it("keeps appending after gaps left by removed tracks", () => {
    expect(nextPosition([0, 5])).toBe(6);
  });

  it("handles duplicate positions", () => {
    expect(nextPosition([2, 2])).toBe(3);
  });
});
