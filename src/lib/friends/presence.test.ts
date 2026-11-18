import { describe, expect, it } from "vitest";

import {
  isActiveNow,
  mapActiveFriendRow,
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

describe("isActiveNow", () => {
  it("accepts timestamps within the ten-minute window", () => {
    expect(isActiveNow("2026-11-16T11:50:00.000Z", NOW)).toBe(true);
    expect(isActiveNow("2026-11-16T11:59:00.000Z", NOW)).toBe(true);
  });

  it("accepts a timestamp exactly ten minutes old", () => {
    expect(isActiveNow(new Date(NOW - PRESENCE_TTL_MS).toISOString(), NOW)).toBe(true);
  });

  it("rejects a timestamp eleven minutes old", () => {
    expect(isActiveNow(new Date(NOW - PRESENCE_TTL_MS - 60_000).toISOString(), NOW)).toBe(false);
  });

  it("accepts a future timestamp caused by clock skew", () => {
    expect(isActiveNow(new Date(NOW + 5 * 60_000).toISOString(), NOW)).toBe(true);
  });

  it("rejects unparseable timestamps", () => {
    expect(isActiveNow("not-a-date", NOW)).toBe(false);
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

describe("mapActiveFriendRow", () => {
  it("keeps the friend profile next to the track", () => {
    expect(
      mapActiveFriendRow(
        presenceRow({
          friend_display_name: null,
          friend_avatar_url: "https://example.com/avatar.png",
        }),
      ),
    ).toEqual({
      friendId: "8f14e45f-ea0a-4c3b-9f1e-93a3f6a2d9b1",
      username: "layla",
      displayName: null,
      avatarUrl: "https://example.com/avatar.png",
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
