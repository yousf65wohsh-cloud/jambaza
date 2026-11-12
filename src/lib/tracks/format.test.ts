import { describe, expect, it } from "vitest";

import { formatDuration } from "./format";

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(59)).toBe("0:59");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("keeps m:ss for durations longer than an hour", () => {
    expect(formatDuration(3600)).toBe("60:00");
    expect(formatDuration(3725)).toBe("62:05");
  });

  it("floors fractional seconds", () => {
    expect(formatDuration(65.9)).toBe("1:05");
  });

  it("returns a dash for missing or invalid durations", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");
    expect(formatDuration(-1)).toBe("—");
    expect(formatDuration(Number.NaN)).toBe("—");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("—");
  });
});
