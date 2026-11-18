"use client";

import { apiFail, apiOk } from "@/lib/api/result";
import { AppError } from "@/lib/errors";
import { getSupabaseAndUser, listMyFriendships } from "@/lib/friends/data";
import type { ApiErrorCode, ApiResponse } from "@/types/api";

import { createRoom } from "./data";

const INVITE_FAILED_MESSAGE = "تعذّر إرسال دعوة الاستماع. حاول مرة أخرى.";
const FRIENDS_CHECK_FAILED_MESSAGE = "تعذّر التحقق من قائمة الأصدقاء. حاول مرة أخرى.";
const FRIEND_ONLY_MESSAGE = "يمكنك دعوة أصدقائك المقبولين فقط.";
const INVITES_LOAD_FAILED_MESSAGE = "تعذّر تحميل دعوات الاستماع. حاول مرة أخرى.";
const INVITE_RESPONSE_FAILED_MESSAGE = "تعذّر الرد على الدعوة. حاول مرة أخرى.";
const INVITE_NOT_FOUND_MESSAGE = "لم يتم العثور على الدعوة، أو تم الرد عليها مسبقاً.";
const JOIN_FAILED_MESSAGE = "تعذّر الانضمام إلى الغرفة. حاول مرة أخرى.";

/** Postgres unique-violation code raised by the room_members primary key. */
const UNIQUE_VIOLATION = "23505";

export interface SessionInvite {
  roomId: string;
  inviteId: string;
  /** True when an identical pending invite already existed and was reused. */
  alreadyPending: boolean;
}

export interface IncomingInvite {
  id: string;
  roomId: string;
  hostId: string;
  hostUsername: string;
  hostDisplayName: string | null;
  hostAvatarUrl: string | null;
  createdAt: string;
}

/**
 * Creates a room hosted by the signed-in user and invites one accepted friend.
 * The friend is not a member until they accept: the invite only holds a
 * `pending` row, so the room stays unreadable to them.
 */
export async function inviteFriendToSession(
  friendId: string,
): Promise<ApiResponse<SessionInvite>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();

    const friendships = await listMyFriendships();

    if (!friendships.ok) {
      throw new AppError("INTERNAL", FRIENDS_CHECK_FAILED_MESSAGE, {
        cause: friendships.error,
      });
    }

    const isAcceptedFriend = friendships.data.accepted.some(
      (friendship) => friendship.friend.id === friendId,
    );

    if (!isAcceptedFriend) {
      throw new AppError("FORBIDDEN", FRIEND_ONLY_MESSAGE);
    }

    const { data: existing, error: existingError } = await supabase
      .from("room_invites")
      .select("id, room_id")
      .eq("inviter_id", userId)
      .eq("invitee_id", friendId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError) {
      throw new AppError("INTERNAL", INVITE_FAILED_MESSAGE, {
        cause: existingError,
      });
    }

    if (existing) {
      return apiOk({
        roomId: existing.room_id,
        inviteId: existing.id,
        alreadyPending: true,
      });
    }

    const roomResult = await createRoom();

    if (!roomResult.ok) {
      // Codes in ApiErrorPayload always originate from AppError.
      const code = roomResult.error.code as ApiErrorCode;

      throw new AppError(code, roomResult.error.message);
    }

    const roomId = roomResult.data.id;

    const { data: invite, error: inviteError } = await supabase
      .from("room_invites")
      .insert({ room_id: roomId, inviter_id: userId, invitee_id: friendId })
      .select("id")
      .maybeSingle();

    if (inviteError || !invite) {
      // Do not leave a room nobody was invited to.
      await supabase.from("listening_rooms").delete().eq("id", roomId);

      throw new AppError("INTERNAL", INVITE_FAILED_MESSAGE, {
        cause: inviteError,
      });
    }

    return apiOk({ roomId, inviteId: invite.id, alreadyPending: false });
  } catch (error) {
    return apiFail<SessionInvite>(error, INVITE_FAILED_MESSAGE);
  }
}

/** Pending invitations addressed to the signed-in user, newest first. */
export async function listIncomingInvites(): Promise<ApiResponse<IncomingInvite[]>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();

    const { data: invites, error: invitesError } = await supabase
      .from("room_invites")
      .select("id, room_id, inviter_id, created_at")
      .eq("invitee_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (invitesError) {
      throw new AppError("INTERNAL", INVITES_LOAD_FAILED_MESSAGE, {
        cause: invitesError,
      });
    }

    if (!invites || invites.length === 0) {
      return apiOk<IncomingInvite[]>([]);
    }

    const hostIds = Array.from(new Set(invites.map((invite) => invite.inviter_id)));

    // profiles RLS exposes accepted friends, so the hosts are readable here.
    const { data: hosts, error: hostsError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", hostIds);

    if (hostsError) {
      throw new AppError("INTERNAL", INVITES_LOAD_FAILED_MESSAGE, {
        cause: hostsError,
      });
    }

    const hostsById = new Map((hosts ?? []).map((host) => [host.id, host]));

    return apiOk(
      invites.map((invite) => {
        const host = hostsById.get(invite.inviter_id);

        return {
          id: invite.id,
          roomId: invite.room_id,
          hostId: invite.inviter_id,
          hostUsername: host?.username ?? "صديق",
          hostDisplayName: host?.display_name ?? null,
          hostAvatarUrl: host?.avatar_url ?? null,
          createdAt: invite.created_at,
        };
      }),
    );
  } catch (error) {
    return apiFail<IncomingInvite[]>(error, INVITES_LOAD_FAILED_MESSAGE);
  }
}

/**
 * Answers a pending invitation addressed to the signed-in user. Accepting adds
 * the user's own `room_members` row (the existing RLS policy allows members to
 * join themselves); declining only updates the invite status.
 */
export async function respondToInvite(
  inviteId: string,
  accept: boolean,
): Promise<ApiResponse<{ roomId: string } | null>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();

    const { data: invite, error: inviteError } = await supabase
      .from("room_invites")
      .select("id, room_id, invitee_id, status")
      .eq("id", inviteId)
      .maybeSingle();

    if (inviteError) {
      throw new AppError("INTERNAL", INVITE_RESPONSE_FAILED_MESSAGE, {
        cause: inviteError,
      });
    }

    if (!invite || invite.invitee_id !== userId || invite.status !== "pending") {
      throw new AppError("NOT_FOUND", INVITE_NOT_FOUND_MESSAGE);
    }

    if (accept) {
      const { error: joinError } = await supabase
        .from("room_members")
        .insert({ room_id: invite.room_id, user_id: userId });

      if (joinError && joinError.code !== UNIQUE_VIOLATION) {
        throw new AppError("INTERNAL", JOIN_FAILED_MESSAGE, { cause: joinError });
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("room_invites")
      .update({
        status: accept ? "accepted" : "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", inviteId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw new AppError("INTERNAL", INVITE_RESPONSE_FAILED_MESSAGE, {
        cause: updateError,
      });
    }

    if (!updated) {
      throw new AppError("CONFLICT", INVITE_NOT_FOUND_MESSAGE);
    }

    return apiOk(accept ? { roomId: invite.room_id } : null);
  } catch (error) {
    return apiFail<{ roomId: string } | null>(error, INVITE_RESPONSE_FAILED_MESSAGE);
  }
}
