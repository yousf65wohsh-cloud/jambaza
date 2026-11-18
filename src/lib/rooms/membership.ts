/**
 * Pure membership rules for listening rooms.
 *
 * The database RLS policies also allow a user to insert their own membership
 * row, so the host-only invite rule has to be enforced in application code.
 * Keeping it here makes the rule easy to test without Supabase.
 */

export interface RoomHostRef {
  hostId: string;
}

export function isHost(
  room: RoomHostRef | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (!room || !currentUserId) {
    return false;
  }

  return room.hostId === currentUserId;
}

export type ListeningRole = "host" | "member" | "none";

export interface ListeningRoleInput {
  /** `listening_rooms.host_id`; missing until the room row is readable. */
  hostId: string | null | undefined;
  /** The signed-in viewer. */
  viewerId: string | null | undefined;
  /**
   * Whether the viewer has a `room_members` row. RLS only exposes a room to its
   * host or its members, so a loaded room row proves membership.
   */
  isMember: boolean;
}

/**
 * The role the viewer plays in a listening session.
 *
 * The user who pressed «استمع معه» creates the room and owns `host_id`, so they
 * are the host. The invited friend is added to `room_members` only after
 * accepting, so they are a member and never the host. Anyone else has no role.
 */
export function listeningRole({
  hostId,
  viewerId,
  isMember,
}: ListeningRoleInput): ListeningRole {
  if (!viewerId) {
    return "none";
  }

  if (hostId && hostId === viewerId) {
    return "host";
  }

  return isMember ? "member" : "none";
}

/** Only the host may invite accepted friends into the room. */
export function canInvite(
  room: RoomHostRef | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return isHost(room, currentUserId);
}

/**
 * A host may leave only when no other members remain, so a room can never be
 * left without anyone who can manage it. `memberCount` includes the host.
 */
export function canHostLeave(memberCount: number): boolean {
  return memberCount <= 1;
}
