"use client";

import { apiFail, apiOk } from "@/lib/api/result";
import { AppError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database";

import { getSupabaseAndUser } from "./data";

/** Presence rows older than this are treated as "not listening now". */
export const PRESENCE_TTL_MS = 10 * 60 * 1000;

const PRESENCE_WRITE_FAILED = "تعذّر تحديث حالة الاستماع.";
const PRESENCE_READ_FAILED = "تعذّر تحميل حالة استماع الأصدقاء. حاول مرة أخرى.";

/** Row shape returned by `public.list_friends_now_listening()`. */
export type NowListeningRow =
  Database["public"]["Functions"]["list_friends_now_listening"]["Returns"][number];

export interface NowListeningTrack {
  id: string;
  title: string;
  artist: string | null;
  coverUrl: string | null;
}

export interface NowListeningEntry {
  friendId: string;
  track: NowListeningTrack;
  updatedAt: string;
}

/**
 * True when a presence timestamp is recent enough to display. Unparseable
 * timestamps are treated as stale.
 */
export function isPresenceFresh(updatedAt: string, now: number = Date.now()): boolean {
  const timestamp = Date.parse(updatedAt);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return now - timestamp <= PRESENCE_TTL_MS;
}

export function mapNowListeningRow(row: NowListeningRow): NowListeningEntry {
  return {
    friendId: row.friend_id,
    track: {
      id: row.track_id,
      title: row.track_title,
      artist: row.track_artist,
      coverUrl: row.track_cover_url,
    },
    updatedAt: row.updated_at,
  };
}

/**
 * Upserts the signed-in user's latest started track. Failures are returned as
 * an ApiResponse and intentionally ignored by the player: presence is a
 * best-effort enhancement, never a reason to interrupt playback.
 */
export async function reportMyPresence(
  trackId: string,
): Promise<ApiResponse<null>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const { error } = await supabase.from("user_presence").upsert(
      {
        user_id: userId,
        track_id: trackId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new AppError("INTERNAL", PRESENCE_WRITE_FAILED, { cause: error });
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, PRESENCE_WRITE_FAILED);
  }
}

/**
 * Accepted friends with a presence row from the last 10 minutes, newest
 * first. The security-definer RPC joins public profile and track metadata so
 * unpublished uploads stay visible to friends without weakening table RLS.
 */
export async function listFriendsNowListening(): Promise<
  ApiResponse<NowListeningEntry[]>
> {
  try {
    const { supabase } = await getSupabaseAndUser();
    const { data, error } = await supabase.rpc("list_friends_now_listening", {});

    if (error) {
      throw new AppError("INTERNAL", PRESENCE_READ_FAILED, { cause: error });
    }

    const now = Date.now();

    return apiOk(
      (data ?? [])
        .map(mapNowListeningRow)
        .filter((entry) => isPresenceFresh(entry.updatedAt, now)),
    );
  } catch (error) {
    return apiFail<NowListeningEntry[]>(error, PRESENCE_READ_FAILED);
  }
}
