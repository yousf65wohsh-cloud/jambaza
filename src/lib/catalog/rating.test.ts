import { describe, expect, it } from "vitest";

import { averageRating } from "./rating";

describe("averageRating", () => {
  it("returns 0 for an empty list", () => {
    expect(averageRating([])).toBe(0);
  });

  it("returns the rating itself for a single value", () => {
    expect(averageRating([4])).toBe(4);
  });

  it("averages whole ratings", () => {
    expect(averageRating([5, 4])).toBe(4.5);
    expect(averageRating([5, 5, 4, 4])).toBe(4.5);
  });

  it("rounds to one decimal place", () => {
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([1, 2, 2])).toBe(1.7);
    expect(averageRating([4, 4, 5])).toBe(4.3);
  });

  it("keeps an exact whole average without a decimal tail", () => {
    expect(averageRating([5, 5, 5])).toBe(5);
    expect(averageRating([1, 1])).toBe(1);
  });
});
