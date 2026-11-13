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

/** Only the host may invite accepted friends into the room. */
export function canInvite(
  room: RoomHostRef | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return isHost(room, currentUserId);
}
