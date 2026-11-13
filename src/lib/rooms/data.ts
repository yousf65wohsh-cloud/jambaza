"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { apiFail, apiOk } from "@/lib/api/result";
import { AppError } from "@/lib/errors";
import { listMyFriendships } from "@/lib/friends/data";
import type { FriendProfile } from "@/lib/friends/mapping";
import { createClient } from "@/lib/supabase/client";
import { isValidYouTubeVideoId } from "@/lib/youtube";
import type { ApiResponse } from "@/types/api";
import type { Database, ListeningRoomRow } from "@/types/database";

import { canHostLeave } from "./membership";

const SIGN_IN_MESSAGE =
  "يجب تسجيل الدخول لإدارة غرف الاستماع. سجّل الدخول ثم أعد المحاولة.";
const CREATE_FAILED_MESSAGE = "تعذّر إنشاء الغرفة. حاول مرة أخرى.";
const LIST_FAILED_MESSAGE = "تعذّر تحميل غرف الاستماع. حاول مرة أخرى.";
const ROOM_LOAD_FAILED_MESSAGE = "تعذّر تحميل الغرفة. حاول مرة أخرى.";
const ROOM_NOT_FOUND_MESSAGE = "لم يتم العثور على الغرفة، أو أنك لست عضواً فيها.";
const MEMBERS_FAILED_MESSAGE = "تعذّر تحميل أعضاء الغرفة. حاول مرة أخرى.";
const PROFILE_FAILED_MESSAGE = "تعذّر تحميل ملفك الشخصي. حاول مرة أخرى.";
const INVITE_FAILED_MESSAGE = "تعذّر دعوة الصديق إلى الغرفة. حاول مرة أخرى.";
const REMOVE_FAILED_MESSAGE = "تعذّر إزالة العضو من الغرفة. حاول مرة أخرى.";
const LEAVE_FAILED_MESSAGE = "تعذّرت مغادرة الغرفة. حاول مرة أخرى.";
const SAVE_VIDEO_FAILED_MESSAGE = "تعذّر حفظ فيديو الغرفة. حاول مرة أخرى.";
const INVALID_VIDEO_ID_MESSAGE = "معرّف فيديو يوتيوب غير صالح.";
const ROOM_UPDATE_NOT_ALLOWED_MESSAGE =
  "لم يتم العثور على الغرفة أو لا تملك صلاحية تعديلها.";
export const HOST_LEAVE_BLOCKED_MESSAGE =
  "لا يمكن للمضيف المغادرة قبل إزالة الأعضاء الآخرين أو حذف الغرفة.";

/** Postgres unique-violation code raised by the room_members primary key. */
const UNIQUE_VIOLATION = "23505";

export interface RoomSummary {
  id: string;
  hostId: string;
  videoId: string;
  isPlaying: boolean;
  positionSeconds: number;
  createdAt: string;
  updatedAt: string;
  /** The signed-in user viewing this room; used by the membership helpers. */
  viewerId: string;
}

export interface RoomMember {
  userId: string;
  joinedAt: string;
}

async function getSupabaseAndUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError("UNAUTHORIZED", SIGN_IN_MESSAGE, { cause: error });
  }

  return { supabase, userId: user.id };
}

function mapRoomRow(row: ListeningRoomRow, viewerId: string): RoomSummary {
  return {
    id: row.id,
    hostId: row.host_id,
    videoId: row.video_id,
    isPlaying: row.is_playing,
    positionSeconds: row.position_seconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    viewerId,
  };
}

async function fetchRoomHost(
  supabase: SupabaseClient<Database>,
  roomId: string,
): Promise<{ host_id: string }> {
  const { data, error } = await supabase
    .from("listening_rooms")
    .select("host_id")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", ROOM_LOAD_FAILED_MESSAGE, { cause: error });
  }

  if (!data) {
    throw new AppError("NOT_FOUND", ROOM_NOT_FOUND_MESSAGE);
  }

  return data;
}

/**
 * Creates a room owned by the signed-in user and adds them as the first member.
 * `video_id` is NOT NULL in the schema, so an omitted video is stored as an
 * empty string until the host publishes playback state.
 */
export async function createRoom(
  videoId?: string,
): Promise<ApiResponse<{ id: string }>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const trimmedVideoId = (videoId ?? "").trim();

    const { data, error } = await supabase
      .from("listening_rooms")
      .insert({ host_id: userId, video_id: trimmedVideoId })
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", CREATE_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("INTERNAL", CREATE_FAILED_MESSAGE);
    }

    const { error: memberError } = await supabase
      .from("room_members")
      .insert({ room_id: data.id, user_id: userId });

    if (memberError) {
      // Do not leave an orphan room without its host membership.
      await supabase.from("listening_rooms").delete().eq("id", data.id);

      throw new AppError("INTERNAL", CREATE_FAILED_MESSAGE, {
        cause: memberError,
      });
    }

    return apiOk({ id: data.id });
  } catch (error) {
    return apiFail<{ id: string }>(error, CREATE_FAILED_MESSAGE);
  }
}

/** Rooms where the signed-in user is a member, newest first. */
export async function listMyRooms(): Promise<ApiResponse<RoomSummary[]>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();

    const { data: memberships, error: membershipError } = await supabase
      .from("room_members")
      .select("room_id")
      .eq("user_id", userId);

    if (membershipError) {
      throw new AppError("INTERNAL", LIST_FAILED_MESSAGE, {
        cause: membershipError,
      });
    }

    if (!memberships || memberships.length === 0) {
      return apiOk<RoomSummary[]>([]);
    }

    const roomIds = Array.from(
      new Set(memberships.map((membership) => membership.room_id)),
    );

    const { data: rooms, error: roomsError } = await supabase
      .from("listening_rooms")
      .select("*")
      .in("id", roomIds)
      .order("created_at", { ascending: false });

    if (roomsError) {
      throw new AppError("INTERNAL", LIST_FAILED_MESSAGE, { cause: roomsError });
    }

    return apiOk((rooms ?? []).map((row) => mapRoomRow(row, userId)));
  } catch (error) {
    return apiFail<RoomSummary[]>(error, LIST_FAILED_MESSAGE);
  }
}

/** One room, only when RLS lets the signed-in user read it. */
export async function getRoom(roomId: string): Promise<ApiResponse<RoomSummary>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const { data, error } = await supabase
      .from("listening_rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", ROOM_LOAD_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", ROOM_NOT_FOUND_MESSAGE);
    }

    return apiOk(mapRoomRow(data, userId));
  } catch (error) {
    return apiFail<RoomSummary>(error, ROOM_LOAD_FAILED_MESSAGE);
  }
}

/** Membership rows of a room, oldest member first. */
export async function listRoomMembers(
  roomId: string,
): Promise<ApiResponse<RoomMember[]>> {
  try {
    const { supabase } = await getSupabaseAndUser();
    const { data, error } = await supabase
      .from("room_members")
      .select("user_id, joined_at")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (error) {
      throw new AppError("INTERNAL", MEMBERS_FAILED_MESSAGE, { cause: error });
    }

    return apiOk(
      (data ?? []).map((row) => ({
        userId: row.user_id,
        joinedAt: row.joined_at,
      })),
    );
  } catch (error) {
    return apiFail<RoomMember[]>(error, MEMBERS_FAILED_MESSAGE);
  }
}

/**
 * Saves only the 11-character video id. RLS restricts the update to the host.
 * A null parser result must be turned into an Arabic link error by the caller;
 * this function only guards against invalid ids that reach it directly.
 */
export async function setRoomVideo(
  roomId: string,
  videoId: string,
): Promise<ApiResponse<null>> {
  try {
    if (!isValidYouTubeVideoId(videoId)) {
      throw new AppError("BAD_REQUEST", INVALID_VIDEO_ID_MESSAGE);
    }

    const { supabase } = await getSupabaseAndUser();
    const { data, error } = await supabase
      .from("listening_rooms")
      .update({ video_id: videoId })
      .eq("id", roomId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", SAVE_VIDEO_FAILED_MESSAGE, {
        cause: error,
      });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", ROOM_UPDATE_NOT_ALLOWED_MESSAGE);
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, SAVE_VIDEO_FAILED_MESSAGE);
  }
}

/** The signed-in user's own profile (profiles RLS always allows self). */
export async function getMyProfile(): Promise<ApiResponse<FriendProfile | null>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", PROFILE_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      return apiOk<FriendProfile | null>(null);
    }

    return apiOk<FriendProfile | null>({
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
    });
  } catch (error) {
    return apiFail<FriendProfile | null>(error, PROFILE_FAILED_MESSAGE);
  }
}

/**
 * Adds an accepted friend to the room. Host-only in the UI and here; RLS also
 * lets a user add themselves, so this check is the actual invite boundary.
 */
export async function inviteFriend(
  roomId: string,
  friendId: string,
): Promise<ApiResponse<null>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const room = await fetchRoomHost(supabase, roomId);

    if (room.host_id !== userId) {
      throw new AppError("FORBIDDEN", "المضيف فقط يمكنه دعوة الأصدقاء إلى الغرفة.");
    }

    const friendships = await listMyFriendships();

    if (!friendships.ok) {
      throw new AppError("INTERNAL", "تعذّر التحقق من قائمة الأصدقاء. حاول مرة أخرى.");
    }

    const isAcceptedFriend = friendships.data.accepted.some(
      (friendship) => friendship.friend.id === friendId,
    );

    if (!isAcceptedFriend) {
      throw new AppError("FORBIDDEN", "يمكنك دعوة أصدقائك المقبولين فقط.");
    }

    const { error } = await supabase
      .from("room_members")
      .insert({ room_id: roomId, user_id: friendId });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new AppError("CONFLICT", "هذا المستخدم عضو في الغرفة بالفعل.", {
          cause: error,
        });
      }

      throw new AppError("INTERNAL", INVITE_FAILED_MESSAGE, { cause: error });
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, INVITE_FAILED_MESSAGE);
  }
}

/** Removes another member. Host-only; the host cannot remove themselves here. */
export async function removeMember(
  roomId: string,
  memberId: string,
): Promise<ApiResponse<null>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const room = await fetchRoomHost(supabase, roomId);

    if (room.host_id !== userId) {
      throw new AppError("FORBIDDEN", "المضيف فقط يمكنه إزالة أعضاء الغرفة.");
    }

    if (memberId === userId) {
      throw new AppError(
        "BAD_REQUEST",
        "لا يمكن للمضيف إزالة نفسه؛ استخدم زر مغادرة الغرفة.",
      );
    }

    const { data, error } = await supabase
      .from("room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", memberId)
      .select("user_id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", REMOVE_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", "هذا المستخدم ليس عضواً في الغرفة.");
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, REMOVE_FAILED_MESSAGE);
  }
}

/**
 * Removes the signed-in user's own membership. A host who leaves keeps
 * `host_id`, so the room row itself is intentionally kept.
 *
 * A host may only leave when no other members remain; otherwise the room would
 * have no one able to manage it.
 */
export async function leaveRoom(roomId: string): Promise<ApiResponse<null>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();

    const { data: room, error: roomError } = await supabase
      .from("listening_rooms")
      .select("host_id")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError) {
      throw new AppError("INTERNAL", ROOM_LOAD_FAILED_MESSAGE, {
        cause: roomError,
      });
    }

    if (room?.host_id === userId) {
      const members = await listRoomMembers(roomId);

      if (!members.ok) {
        throw new AppError("INTERNAL", MEMBERS_FAILED_MESSAGE);
      }

      if (!canHostLeave(members.data.length)) {
        throw new AppError("FORBIDDEN", HOST_LEAVE_BLOCKED_MESSAGE);
      }
    }

    const { data, error } = await supabase
      .from("room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", LEAVE_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", "أنت لست عضواً في هذه الغرفة.");
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, LEAVE_FAILED_MESSAGE);
  }
}
