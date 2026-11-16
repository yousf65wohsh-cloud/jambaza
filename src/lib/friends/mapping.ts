import type {
  Database,
  FriendshipDirection,
  FriendshipStatus,
} from "@/types/database";

/** The four public profile columns exposed by the friends RPCs. */
export interface FriendProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/** One friendship row, already normalized for the UI. */
export interface Friendship {
  id: string;
  status: FriendshipStatus;
  direction: FriendshipDirection;
  friend: FriendProfile;
  createdAt: string;
}

export interface GroupedFriendships {
  accepted: Friendship[];
  incoming: Friendship[];
  outgoing: Friendship[];
}

/** Row shape returned by `public.list_my_friendships()`. */
export type MyFriendshipRow =
  Database["public"]["Functions"]["list_my_friendships"]["Returns"][number];

/** Row shape returned by `public.search_profiles(p_query)`. */
export type ProfileSearchRow =
  Database["public"]["Functions"]["search_profiles"]["Returns"][number];

/** Row shape returned by `public.find_profile_by_friend_code(p_code)`. */
export type FriendCodeProfileRow =
  Database["public"]["Functions"]["find_profile_by_friend_code"]["Returns"][number];

const FRIEND_CODE_PATTERN = /^[A-Z0-9]{8}$/;

/**
 * Trims a search box value. Returns `null` when nothing is left so callers can
 * skip the network request instead of asking Postgres for an empty prefix.
 */
export function normalizeSearchQuery(query: string): string | null {
  const trimmed = query.trim();

  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Friend codes are stored as eight uppercase alphanumerics. Input is trimmed
 * and uppercased, then checked against the database format constraint. Returns
 * `null` for anything that cannot be a valid code.
 */
export function normalizeFriendCode(code: string): string | null {
  const normalized = code.trim().toUpperCase();

  return FRIEND_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function mapProfileRow(row: ProfileSearchRow): FriendProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
}

export function mapFriendshipRow(row: MyFriendshipRow): Friendship {
  return {
    id: row.friendship_id,
    status: row.status,
    direction: row.direction,
    friend: {
      id: row.friend_id,
      username: row.friend_username,
      displayName: row.friend_display_name,
      avatarUrl: row.friend_avatar_url,
    },
    createdAt: row.created_at,
  };
}

/**
 * Splits the RPC rows into the three UI sections. Rows keep the server order
 * (newest first).
 */
export function groupFriendships(
  rows: readonly MyFriendshipRow[],
): GroupedFriendships {
  const grouped: GroupedFriendships = {
    accepted: [],
    incoming: [],
    outgoing: [],
  };

  for (const row of rows) {
    const friendship = mapFriendshipRow(row);

    switch (friendship.direction) {
      case "accepted":
        grouped.accepted.push(friendship);
        break;
      case "incoming":
        grouped.incoming.push(friendship);
        break;
      case "outgoing":
        grouped.outgoing.push(friendship);
        break;
    }
  }

  return grouped;
}
