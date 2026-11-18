import { describe, expect, it } from "vitest";

import { formatDuration } from "./format";

describe("formatDuration", () => {
  it("formats zero seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("formats under a minute", () => {
    expect(formatDuration(59)).toBe("0:59");
  });

  it("formats a full minute", () => {
    expect(formatDuration(60)).toBe("1:00");
  });

  it("formats just under an hour", () => {
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("uses a placeholder for a missing duration", () => {
    expect(formatDuration(null)).toBe("--:--");
  });
});
