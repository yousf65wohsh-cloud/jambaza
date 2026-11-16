import { describe, expect, it } from "vitest";

import {
  ROOM_BROADCAST_INTERVAL_MS,
  estimateRoomPosition,
  expectedRemotePosition,
  isRoomSyncPayload,
} from "./sync";

describe("ROOM_BROADCAST_INTERVAL_MS", () => {
  it("broadcasts every five seconds", () => {
    expect(ROOM_BROADCAST_INTERVAL_MS).toBe(5_000);
  });
});

describe("estimateRoomPosition", () => {
  const now = Date.parse("2026-11-16T12:00:00.000Z");

  it("returns the stored position while paused", () => {
    expect(
      estimateRoomPosition(
        {
          positionSeconds: 42,
          isPlaying: false,
          updatedAt: "2026-11-16T11:00:00.000Z",
        },
        now,
      ),
    ).toBe(42);
  });

  it("advances from updated_at while playing", () => {
    expect(
      estimateRoomPosition(
        {
          positionSeconds: 10,
          isPlaying: true,
          updatedAt: "2026-11-16T11:59:55.000Z",
        },
        now,
      ),
    ).toBe(15);
  });

  it("does not go backwards when updated_at is in the future", () => {
    expect(
      estimateRoomPosition(
        {
          positionSeconds: 10,
          isPlaying: true,
          updatedAt: "2026-11-16T12:00:05.000Z",
        },
        now,
      ),
    ).toBe(10);
  });

  it("falls back to the stored position for invalid timestamps", () => {
    expect(
      estimateRoomPosition(
        { positionSeconds: 7, isPlaying: true, updatedAt: "not-a-date" },
        now,
      ),
    ).toBe(7);
  });
});

describe("expectedRemotePosition", () => {
  it("adds elapsed time for a playing host", () => {
    expect(
      expectedRemotePosition(
        { state: "playing", position: 30, sentAt: 1_000 },
        3_500,
      ),
    ).toBeCloseTo(32.5);
  });

  it("keeps the sent position while paused", () => {
    expect(
      expectedRemotePosition(
        { state: "paused", position: 30, sentAt: 1_000 },
        9_000,
      ),
    ).toBe(30);
  });

  it("clamps clock skew to one broadcast interval", () => {
    expect(
      expectedRemotePosition(
        { state: "playing", position: 0, sentAt: 0 },
        60_000,
      ),
    ).toBe(5);
  });

  it("never returns a negative position", () => {
    expect(
      expectedRemotePosition(
        { state: "playing", position: -5, sentAt: 10_000 },
        10_000,
      ),
    ).toBe(0);
  });
});

describe("isRoomSyncPayload", () => {
  const valid = {
    state: "playing" as const,
    position: 12.5,
    trackId: "3f0d6f12-7f9a-4c44-9a4f-4bc4e1a1c111",
    sentAt: 1_700_000_000_000,
    signedUrl: "https://example.test/audio.mp3?token=abc",
    track: {
      id: "3f0d6f12-7f9a-4c44-9a4f-4bc4e1a1c111",
      title: "Track",
      artist: null,
      coverUrl: null,
      durationSeconds: 180,
    },
  };

  it("accepts a complete host payload", () => {
    expect(isRoomSyncPayload(valid)).toBe(true);
  });

  it("accepts a paused room with no track", () => {
    expect(
      isRoomSyncPayload({
        state: "paused",
        position: 0,
        trackId: null,
        sentAt: 1_700_000_000_000,
      }),
    ).toBe(true);
  });

  it("rejects malformed states, numbers and track ids", () => {
    expect(isRoomSyncPayload(null)).toBe(false);
    expect(isRoomSyncPayload({ ...valid, state: "buffering" })).toBe(false);
    expect(isRoomSyncPayload({ ...valid, position: Number.NaN })).toBe(false);
    expect(isRoomSyncPayload({ ...valid, trackId: 12 })).toBe(false);
    expect(isRoomSyncPayload({ ...valid, sentAt: "now" })).toBe(false);
    expect(isRoomSyncPayload({ ...valid, signedUrl: 12 })).toBe(false);
    expect(isRoomSyncPayload({ ...valid, track: { id: "x" } })).toBe(false);
  });
});
