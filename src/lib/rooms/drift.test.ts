import { describe, expect, it } from "vitest";

import { ROOM_DRIFT_THRESHOLD_SECONDS, checkDrift } from "./drift";

describe("checkDrift", () => {
  it("uses a 2 second threshold", () => {
    expect(ROOM_DRIFT_THRESHOLD_SECONDS).toBe(2);
  });

  it("does not seek when the difference is exactly 2 seconds", () => {
    const result = checkDrift({ localSeconds: 10, remoteSeconds: 12 });

    expect(result).toEqual({ driftSeconds: 2, shouldSeek: false, targetSeconds: 12 });
  });

  it("does not seek when the difference is within the threshold", () => {
    expect(checkDrift({ localSeconds: 30, remoteSeconds: 31.9 }).shouldSeek).toBe(false);
    expect(checkDrift({ localSeconds: 30, remoteSeconds: 28.1 }).shouldSeek).toBe(false);
  });

  it("seeks when the remote position is more than 2 seconds ahead", () => {
    const result = checkDrift({ localSeconds: 10, remoteSeconds: 12.5 });

    expect(result.shouldSeek).toBe(true);
    expect(result.driftSeconds).toBeCloseTo(2.5);
    expect(result.targetSeconds).toBe(12.5);
  });

  it("seeks when the local position is more than 2 seconds ahead", () => {
    const result = checkDrift({ localSeconds: 20, remoteSeconds: 17 });

    expect(result.shouldSeek).toBe(true);
    expect(result.driftSeconds).toBe(-3);
    expect(result.targetSeconds).toBe(17);
  });

  it("supports a custom threshold", () => {
    expect(checkDrift({ localSeconds: 0, remoteSeconds: 4, threshold: 5 }).shouldSeek).toBe(false);
    expect(checkDrift({ localSeconds: 0, remoteSeconds: 6, threshold: 5 }).shouldSeek).toBe(true);
  });

  it("never returns a negative target position", () => {
    const result = checkDrift({ localSeconds: 0, remoteSeconds: -4 });

    expect(result.targetSeconds).toBe(0);
    expect(result.driftSeconds).toBe(0);
    expect(result.shouldSeek).toBe(false);
  });

  it("ignores non-finite positions", () => {
    expect(checkDrift({ localSeconds: Number.NaN, remoteSeconds: 10 })).toEqual({
      driftSeconds: 0,
      shouldSeek: false,
      targetSeconds: 0,
    });
    expect(checkDrift({ localSeconds: 10, remoteSeconds: Number.POSITIVE_INFINITY })).toEqual({
      driftSeconds: 0,
      shouldSeek: false,
      targetSeconds: 0,
    });
  });
});
