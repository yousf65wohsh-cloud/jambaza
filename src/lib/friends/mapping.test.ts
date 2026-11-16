import { describe, expect, it } from "vitest";

import { addFriendByCode, searchProfiles } from "./data";
import {
  groupFriendships,
  mapFriendshipRow,
  normalizeFriendCode,
  normalizeSearchQuery,
  type MyFriendshipRow,
} from "./mapping";

const FRIEND_ID = "8f14e45f-ea0a-4c3b-9f1e-93a3f6a2d9b1";
const OTHER_ID = "f1d2d2f4-6e5c-4b2a-8a0e-8a3f5e9c1b7d";
const THIRD_ID = "9c9b8a7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d";

function friendshipRow(overrides: Partial<MyFriendshipRow> = {}): MyFriendshipRow {
  return {
    friendship_id: "11111111-1111-4111-8111-111111111111",
    status: "accepted",
    direction: "accepted",
    friend_id: FRIEND_ID,
    friend_username: "layla",
    friend_display_name: "ليلى",
    friend_avatar_url: null,
    created_at: "2026-11-15T10:00:00+00:00",
    ...overrides,
  };
}

describe("normalizeSearchQuery", () => {
  it("trims the query", () => {
    expect(normalizeSearchQuery("  layla  ")).toBe("layla");
  });

  it("returns null for empty and whitespace-only queries", () => {
    expect(normalizeSearchQuery("")).toBeNull();
    expect(normalizeSearchQuery("   ")).toBeNull();
    expect(normalizeSearchQuery("\n\t")).toBeNull();
  });
});

describe("normalizeFriendCode", () => {
  it("trims and uppercases a valid code", () => {
    expect(normalizeFriendCode("  abcd2345  ")).toBe("ABCD2345");
  });

  it("returns null for codes that cannot match the database format", () => {
    expect(normalizeFriendCode("")).toBeNull();
    expect(normalizeFriendCode("ABC")).toBeNull();
    expect(normalizeFriendCode("ABCD-2345")).toBeNull();
    expect(normalizeFriendCode("ABCD23456")).toBeNull();
  });
});

describe("mapFriendshipRow", () => {
  it("maps snake_case RPC columns to the UI shape", () => {
    expect(mapFriendshipRow(friendshipRow())).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      status: "accepted",
      direction: "accepted",
      friend: {
        id: FRIEND_ID,
        username: "layla",
        displayName: "ليلى",
        avatarUrl: null,
      },
      createdAt: "2026-11-15T10:00:00+00:00",
    });
  });
});

describe("groupFriendships", () => {
  it("splits accepted, incoming and outgoing rows", () => {
    const grouped = groupFriendships([
      friendshipRow(),
      friendshipRow({
        friendship_id: "22222222-2222-4222-8222-222222222222",
        status: "pending",
        direction: "incoming",
        friend_id: OTHER_ID,
        friend_username: "omar",
        friend_display_name: null,
      }),
      friendshipRow({
        friendship_id: "33333333-3333-4333-8333-333333333333",
        status: "pending",
        direction: "outgoing",
        friend_id: THIRD_ID,
        friend_username: "sara",
        friend_display_name: "سارة",
      }),
    ]);

    expect(grouped.accepted.map((friendship) => friendship.friend.username)).toEqual([
      "layla",
    ]);
    expect(grouped.incoming.map((friendship) => friendship.friend.username)).toEqual([
      "omar",
    ]);
    expect(grouped.outgoing.map((friendship) => friendship.friend.username)).toEqual([
      "sara",
    ]);
    expect(grouped.incoming[0]?.status).toBe("pending");
    expect(grouped.outgoing[0]?.friend.displayName).toBe("سارة");
  });

  it("keeps the server order inside each section", () => {
    const grouped = groupFriendships([
      friendshipRow({ friendship_id: "a", friend_username: "newer" }),
      friendshipRow({ friendship_id: "b", friend_username: "older" }),
    ]);

    expect(grouped.accepted.map((friendship) => friendship.friend.username)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("returns three empty arrays for no rows", () => {
    expect(groupFriendships([])).toEqual({
      accepted: [],
      incoming: [],
      outgoing: [],
    });
  });
});

describe("searchProfiles with an empty query", () => {
  it("returns an empty list without calling the server", async () => {
    await expect(searchProfiles("")).resolves.toEqual({ ok: true, data: [] });
    await expect(searchProfiles("   ")).resolves.toEqual({ ok: true, data: [] });
  });
});

describe("addFriendByCode with an invalid code", () => {
  it("rejects before touching the network and uses an Arabic message", async () => {
    const result = await addFriendByCode("abc");

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.message).toContain("8");
      expect(result.error.message).toMatch(/[\u0600-\u06FF]/);
    }
  });
});
