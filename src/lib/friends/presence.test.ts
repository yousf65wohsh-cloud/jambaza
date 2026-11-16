import { describe, expect, it } from "vitest";

import {
  isPresenceFresh,
  mapNowListeningRow,
  PRESENCE_TTL_MS,
  type NowListeningRow,
} from "./presence";

const NOW = Date.parse("2026-11-16T12:00:00.000Z");

function presenceRow(overrides: Partial<NowListeningRow> = {}): NowListeningRow {
  return {
    friend_id: "8f14e45f-ea0a-4c3b-9f1e-93a3f6a2d9b1",
    friend_username: "layla",
    friend_display_name: "ليلى",
    friend_avatar_url: null,
    track_id: "11111111-1111-4111-8111-111111111111",
    track_title: "أغنية الصباح",
    track_artist: "ليلى",
    track_cover_url: null,
    updated_at: "2026-11-16T11:59:00.000Z",
    ...overrides,
  };
}

describe("isPresenceFresh", () => {
  it("accepts timestamps within the ten-minute window", () => {
    expect(isPresenceFresh("2026-11-16T11:50:00.000Z", NOW)).toBe(true);
    expect(isPresenceFresh("2026-11-16T11:59:00.000Z", NOW)).toBe(true);
  });

  it("rejects timestamps older than the window", () => {
    expect(
      isPresenceFresh(
        new Date(NOW - PRESENCE_TTL_MS - 1).toISOString(),
        NOW,
      ),
    ).toBe(false);
  });

  it("rejects unparseable timestamps", () => {
    expect(isPresenceFresh("not-a-date", NOW)).toBe(false);
  });
});

describe("mapNowListeningRow", () => {
  it("maps snake_case RPC columns to the UI entry", () => {
    expect(mapNowListeningRow(presenceRow())).toEqual({
      friendId: "8f14e45f-ea0a-4c3b-9f1e-93a3f6a2d9b1",
      track: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "أغنية الصباح",
        artist: "ليلى",
        coverUrl: null,
      },
      updatedAt: "2026-11-16T11:59:00.000Z",
    });
  });
});
