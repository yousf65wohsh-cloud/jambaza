"use client";

import { apiFail, apiOk } from "@/lib/api/result";
import { AppError } from "@/lib/errors";
import { removeOffline } from "@/lib/offline/files";
import { createClient } from "@/lib/supabase/client";
import { parsePublicStoragePath } from "@/lib/upload/paths";
import type { ApiResponse } from "@/types/api";
import { mapTrackRow, type Track } from "@/types/track";

export const TRACKS_PAGE_SIZE = 50;

export interface TrackPage {
  tracks: Track[];
  hasMore: boolean;
}

export interface ListTracksOptions {
  limit?: number;
  offset?: number;
}

export interface CreateTrackInput {
  id: string;
  title: string;
  artist: string | null;
  coverUrl: string | null;
  audioPath: string;
  durationSeconds: number | null;
}

async function getSupabaseAndUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError(
      "UNAUTHORIZED",
      "يجب تسجيل الدخول للمتابعة. سجّل الدخول ثم أعد المحاولة.",
      { cause: error },
    );
  }

  return { supabase, userId: user.id };
}

/** Lists the signed-in user's uploaded tracks, newest first. */
export async function listTracks(
  options: ListTracksOptions = {},
): Promise<ApiResponse<TrackPage>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const limit = Math.min(
      Math.max(Math.trunc(options.limit ?? TRACKS_PAGE_SIZE), 1),
      TRACKS_PAGE_SIZE,
    );
    const offset = Math.max(Math.trunc(options.offset ?? 0), 0);

    const { data, error } = await supabase
      .from("tracks")
      .select("*")
      .eq("owner_id", userId)
      .eq("source_type", "upload")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppError("INTERNAL", "تعذّر تحميل مكتبتك. حاول مرة أخرى.", {
        cause: error,
      });
    }

    const rows = data ?? [];

    return apiOk({
      tracks: rows.map(mapTrackRow),
      hasMore: rows.length === limit,
    });
  } catch (error) {
    return apiFail<TrackPage>(error, "تعذّر تحميل مكتبتك. حاول مرة أخرى.");
  }
}

/** Inserts the tracks row after the files have been uploaded. */
export async function createTrack(input: CreateTrackInput): Promise<ApiResponse<Track>> {
  try {
    const title = input.title.trim();
    if (!title) {
      throw new AppError("BAD_REQUEST", "عنوان الأغنية مطلوب.");
    }
    if (title.length > 120) {
      throw new AppError("BAD_REQUEST", "عنوان الأغنية يجب ألا يتجاوز 120 حرفاً.");
    }

    const { supabase, userId } = await getSupabaseAndUser();
    const { data, error } = await supabase
      .from("tracks")
      .insert({
        id: input.id,
        owner_id: userId,
        title,
        artist: input.artist?.trim() || null,
        cover_url: input.coverUrl,
        audio_path: input.audioPath,
        duration_seconds: input.durationSeconds,
        source_type: "upload",
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError("INTERNAL", "تعذّر حفظ الأغنية. حاول مرة أخرى.", {
        cause: error,
      });
    }

    return apiOk(mapTrackRow(data));
  } catch (error) {
    return apiFail<Track>(error, "تعذّر حفظ الأغنية. حاول مرة أخرى.");
  }
}

/** Deletes a track row, its storage files, and its local offline cache copy. */
export async function deleteTrack(track: Track): Promise<ApiResponse<null>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();

    if (track.ownerId !== userId) {
      throw new AppError("FORBIDDEN", "لا تملك صلاحية حذف هذه الأغنية.");
    }

    if (track.audioPath) {
      const { error } = await supabase.storage.from("audio").remove([track.audioPath]);

      if (error) {
        throw new AppError("INTERNAL", "تعذّر حذف ملف الصوت. حاول مرة أخرى.", {
          cause: error,
        });
      }
    }

    const coverPath = track.coverUrl
      ? parsePublicStoragePath(track.coverUrl, "covers")
      : null;

    if (coverPath) {
      const { error } = await supabase.storage.from("covers").remove([coverPath]);

      if (error) {
        throw new AppError("INTERNAL", "تعذّر حذف صورة الغلاف. حاول مرة أخرى.", {
          cause: error,
        });
      }
    }

    try {
      await removeOffline(track.id);
    } catch (cause) {
      throw new AppError("INTERNAL", "تعذّر حذف نسخة التخزين المحلي. حاول مرة أخرى.", {
        cause,
      });
    }

    const { data, error } = await supabase
      .from("tracks")
      .delete()
      .eq("id", track.id)
      .eq("owner_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", "تعذّر حذف الأغنية. حاول مرة أخرى.", {
        cause: error,
      });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", "لم يتم العثور على الأغنية.");
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, "تعذّر حذف الأغنية. حاول مرة أخرى.");
  }
}
