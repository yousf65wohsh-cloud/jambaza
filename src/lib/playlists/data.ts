"use client";

import { apiFail, apiOk } from "@/lib/api/result";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { ApiResponse } from "@/types/api";
import {
  mapPlaylistRow,
  type Playlist,
  type PlaylistDetails,
} from "@/types/playlist";
import { mapTrackRow, type Track } from "@/types/track";

import { nextPosition } from "./position";

export const MAX_PLAYLIST_NAME_LENGTH = 80;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SIGN_IN_MESSAGE = "يجب تسجيل الدخول لإدارة قوائم التشغيل. سجّل الدخول ثم أعد المحاولة.";
const LIST_FAILED_MESSAGE = "تعذّر تحميل قوائم التشغيل. حاول مرة أخرى.";
const LOAD_FAILED_MESSAGE = "تعذّر تحميل قائمة التشغيل. حاول مرة أخرى.";
const CREATE_FAILED_MESSAGE = "تعذّر إنشاء قائمة التشغيل. حاول مرة أخرى.";
const RENAME_FAILED_MESSAGE = "تعذّر إعادة تسمية قائمة التشغيل. حاول مرة أخرى.";
const DELETE_FAILED_MESSAGE = "تعذّر حذف قائمة التشغيل. حاول مرة أخرى.";
const ADD_FAILED_MESSAGE = "تعذّر إضافة الأغنية إلى قائمة التشغيل. حاول مرة أخرى.";
const REMOVE_FAILED_MESSAGE = "تعذّر إزالة الأغنية من قائمة التشغيل. حاول مرة أخرى.";
const NOT_FOUND_MESSAGE = "لم يتم العثور على قائمة التشغيل.";
const INVALID_ID_MESSAGE = "معرّف قائمة التشغيل غير صالح.";
const DUPLICATE_TRACK_MESSAGE = "الأغنية موجودة بالفعل في قائمة التشغيل.";

/** Postgres unique-violation code raised by the playlist_tracks primary key. */
const UNIQUE_VIOLATION = "23505";
/** Postgres insufficient-privilege code raised by RLS policies. */
const RLS_VIOLATION = "42501";

function isPlaylistId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function normalizePlaylistName(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new AppError("BAD_REQUEST", "اسم قائمة التشغيل مطلوب.");
  }

  if (trimmed.length > MAX_PLAYLIST_NAME_LENGTH) {
    throw new AppError(
      "BAD_REQUEST",
      `اسم قائمة التشغيل يجب ألا يتجاوز ${MAX_PLAYLIST_NAME_LENGTH} حرفاً.`,
    );
  }

  return trimmed;
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

async function getOwnedPlaylist(playlistId: string) {
  const { supabase, userId } = await getSupabaseAndUser();

  if (!isPlaylistId(playlistId)) {
    throw new AppError("BAD_REQUEST", INVALID_ID_MESSAGE);
  }

  const { data, error } = await supabase
    .from("playlists")
    .select("id")
    .eq("id", playlistId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", LOAD_FAILED_MESSAGE, { cause: error });
  }

  if (!data) {
    throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
  }

  return { supabase, userId };
}

/** Every playlist owned by the signed-in user, most recently updated first. */
export async function listMyPlaylists(): Promise<ApiResponse<Playlist[]>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const { data: playlistRows, error } = await supabase
      .from("playlists")
      .select("*")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new AppError("INTERNAL", LIST_FAILED_MESSAGE, { cause: error });
    }

    const rows = playlistRows ?? [];

    if (rows.length === 0) {
      return apiOk<Playlist[]>([]);
    }

    const { data: linkRows, error: linksError } = await supabase
      .from("playlist_tracks")
      .select("playlist_id")
      .in(
        "playlist_id",
        rows.map((row) => row.id),
      );

    if (linksError) {
      throw new AppError("INTERNAL", LIST_FAILED_MESSAGE, { cause: linksError });
    }

    const counts = new Map<string, number>();

    for (const link of linkRows ?? []) {
      counts.set(link.playlist_id, (counts.get(link.playlist_id) ?? 0) + 1);
    }

    return apiOk(rows.map((row) => mapPlaylistRow(row, counts.get(row.id) ?? 0)));
  } catch (error) {
    return apiFail<Playlist[]>(error, LIST_FAILED_MESSAGE);
  }
}

/** One owned playlist with its tracks ordered by playlist position. */
export async function getPlaylist(
  playlistId: string,
): Promise<ApiResponse<PlaylistDetails | null>> {
  if (!isPlaylistId(playlistId)) {
    return apiOk<PlaylistDetails | null>(null);
  }

  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const { data: playlistRow, error } = await supabase
      .from("playlists")
      .select("*")
      .eq("id", playlistId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", LOAD_FAILED_MESSAGE, { cause: error });
    }

    if (!playlistRow) {
      return apiOk<PlaylistDetails | null>(null);
    }

    const { data: linkRows, error: linksError } = await supabase
      .from("playlist_tracks")
      .select("track_id, position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true })
      .order("track_id", { ascending: true });

    if (linksError) {
      throw new AppError("INTERNAL", LOAD_FAILED_MESSAGE, { cause: linksError });
    }

    const links = linkRows ?? [];

    if (links.length === 0) {
      return apiOk<PlaylistDetails | null>({
        ...mapPlaylistRow(playlistRow, 0),
        tracks: [],
      });
    }

    const { data: trackRows, error: tracksError } = await supabase
      .from("tracks")
      .select("*")
      .in(
        "id",
        links.map((link) => link.track_id),
      );

    if (tracksError) {
      throw new AppError("INTERNAL", LOAD_FAILED_MESSAGE, { cause: tracksError });
    }

    const tracksById = new Map((trackRows ?? []).map((row) => [row.id, mapTrackRow(row)]));
    const tracks = links
      .map((link) => tracksById.get(link.track_id))
      .filter((track): track is Track => Boolean(track));

    return apiOk<PlaylistDetails | null>({
      ...mapPlaylistRow(playlistRow, tracks.length),
      tracks,
    });
  } catch (error) {
    return apiFail<PlaylistDetails | null>(error, LOAD_FAILED_MESSAGE);
  }
}

/** Creates an empty personal playlist. Playlists stay private in this phase. */
export async function createPlaylist(name: string): Promise<ApiResponse<Playlist>> {
  try {
    const normalizedName = normalizePlaylistName(name);
    const { supabase, userId } = await getSupabaseAndUser();
    const { data, error } = await supabase
      .from("playlists")
      .insert({
        owner_id: userId,
        name: normalizedName,
        is_public: false,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError("INTERNAL", CREATE_FAILED_MESSAGE, { cause: error });
    }

    return apiOk(mapPlaylistRow(data));
  } catch (error) {
    return apiFail<Playlist>(error, CREATE_FAILED_MESSAGE);
  }
}

/** Renames an owned playlist. */
export async function renamePlaylist(
  playlistId: string,
  name: string,
): Promise<ApiResponse<null>> {
  try {
    const normalizedName = normalizePlaylistName(name);
    const { supabase, userId } = await getSupabaseAndUser();

    if (!isPlaylistId(playlistId)) {
      throw new AppError("BAD_REQUEST", INVALID_ID_MESSAGE);
    }

    const { data, error } = await supabase
      .from("playlists")
      .update({ name: normalizedName })
      .eq("id", playlistId)
      .eq("owner_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", RENAME_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, RENAME_FAILED_MESSAGE);
  }
}

/** Deletes an owned playlist and its playlist_tracks rows (ON DELETE CASCADE). */
export async function deletePlaylist(playlistId: string): Promise<ApiResponse<null>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();

    if (!isPlaylistId(playlistId)) {
      throw new AppError("BAD_REQUEST", INVALID_ID_MESSAGE);
    }

    const { data, error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", playlistId)
      .eq("owner_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", DELETE_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, DELETE_FAILED_MESSAGE);
  }
}

/** Appends a track to an owned playlist at the next position. */
export async function addTrackToPlaylist(
  playlistId: string,
  trackId: string,
): Promise<ApiResponse<null>> {
  try {
    const { supabase } = await getOwnedPlaylist(playlistId);

    const { data: positionRows, error: positionsError } = await supabase
      .from("playlist_tracks")
      .select("position")
      .eq("playlist_id", playlistId);

    if (positionsError) {
      throw new AppError("INTERNAL", ADD_FAILED_MESSAGE, { cause: positionsError });
    }

    const position = nextPosition((positionRows ?? []).map((row) => row.position));
    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: playlistId,
      track_id: trackId,
      position,
    });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new AppError("CONFLICT", DUPLICATE_TRACK_MESSAGE, { cause: error });
      }

      if (error.code === RLS_VIOLATION) {
        throw new AppError("FORBIDDEN", "لا تملك صلاحية تعديل قائمة التشغيل.", {
          cause: error,
        });
      }

      throw new AppError("INTERNAL", ADD_FAILED_MESSAGE, { cause: error });
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, ADD_FAILED_MESSAGE);
  }
}

/** Removes a track from an owned playlist. The remaining positions are unchanged. */
export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string,
): Promise<ApiResponse<null>> {
  try {
    const { supabase } = await getOwnedPlaylist(playlistId);
    const { data, error } = await supabase
      .from("playlist_tracks")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("track_id", trackId)
      .select("track_id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", REMOVE_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", "الأغنية ليست في قائمة التشغيل.");
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, REMOVE_FAILED_MESSAGE);
  }
}
