import type { SupabaseClient } from "@supabase/supabase-js";

import { apiFail, apiOk } from "@/lib/api/result";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database";
import {
  mapTrackCommentRow,
  mapTrackRatingRow,
  mapTrackRow,
  type RatedTrack,
  type Track,
  type TrackComment,
  type TrackRating,
} from "@/types/track";

import { averageRating } from "./rating";
import { isTrackId } from "./validation";

export const CATALOG_PAGE_SIZE = 24;

const LATEST_LIMIT = 10;
const TOP_RATED_LIMIT = 5;

const CATALOG_LOAD_FAILED = "تعذّر تحميل الكتالوج. حاول مرة أخرى.";
const TRACK_LOAD_FAILED = "تعذّر تحميل الأغنية. حاول مرة أخرى.";
const RATINGS_LOAD_FAILED = "تعذّر تحميل التقييمات. حاول مرة أخرى.";
const COMMENTS_LOAD_FAILED = "تعذّر تحميل التعليقات. حاول مرة أخرى.";

export interface CatalogPage {
  tracks: Track[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/**
 * The catalog tables are readable by authenticated users only, so pages check
 * for a session before querying and can show a sign-in prompt instead of an
 * RLS-induced error.
 */
export async function hasCatalogSession(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    return !error && Boolean(user);
  } catch {
    return false;
  }
}

/** Newest published tracks, newest first. */
export async function listLatest(limit: number = LATEST_LIMIT): Promise<ApiResponse<Track[]>> {
  try {
    const supabase = await createClient();
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
    const { data, error } = await supabase
      .from("tracks")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw new AppError("INTERNAL", CATALOG_LOAD_FAILED, { cause: error });
    }

    return apiOk((data ?? []).map(mapTrackRow));
  } catch (error) {
    return apiFail<Track[]>(error, CATALOG_LOAD_FAILED);
  }
}

/** Published tracks ordered by their average rating, highest first. */
export async function listTopRated(
  limit: number = TOP_RATED_LIMIT,
): Promise<ApiResponse<RatedTrack[]>> {
  try {
    const supabase = await createClient();
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
    const { data: trackRows, error } = await supabase
      .from("tracks")
      .select("*")
      .eq("is_published", true);

    if (error) {
      throw new AppError("INTERNAL", CATALOG_LOAD_FAILED, { cause: error });
    }

    const rows = trackRows ?? [];

    if (rows.length === 0) {
      return apiOk<RatedTrack[]>([]);
    }

    const ratingsByTrack = await fetchRatingsByTrack(
      supabase,
      rows.map((row) => row.id),
    );

    const ratedTracks = rows
      .map((row): RatedTrack => {
        const values = ratingsByTrack.get(row.id) ?? [];

        return {
          ...mapTrackRow(row),
          averageRating: averageRating(values),
          ratingCount: values.length,
        };
      })
      .filter((track) => track.ratingCount > 0)
      .sort(
        (a, b) =>
          b.averageRating - a.averageRating ||
          b.ratingCount - a.ratingCount ||
          a.title.localeCompare(b.title, "ar"),
      );

    return apiOk(ratedTracks.slice(0, safeLimit));
  } catch (error) {
    return apiFail<RatedTrack[]>(error, CATALOG_LOAD_FAILED);
  }
}

/** One page of published tracks, newest first. */
export async function listAll(page: number = 1): Promise<ApiResponse<CatalogPage>> {
  try {
    const supabase = await createClient();
    const safePage = Math.max(Math.trunc(page) || 1, 1);
    const offset = (safePage - 1) * CATALOG_PAGE_SIZE;
    const { data, error, count } = await supabase
      .from("tracks")
      .select("*", { count: "exact" })
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + CATALOG_PAGE_SIZE - 1);

    if (error) {
      throw new AppError("INTERNAL", CATALOG_LOAD_FAILED, { cause: error });
    }

    const tracks = (data ?? []).map(mapTrackRow);
    const total = count ?? tracks.length;

    return apiOk({
      tracks,
      page: safePage,
      pageSize: CATALOG_PAGE_SIZE,
      total,
      hasMore: offset + tracks.length < total,
    });
  } catch (error) {
    return apiFail<CatalogPage>(error, CATALOG_LOAD_FAILED);
  }
}

/** A single published track. Unpublished tracks resolve to null. */
export async function getTrack(trackId: string): Promise<ApiResponse<Track | null>> {
  if (!isTrackId(trackId)) {
    return apiOk<Track | null>(null);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tracks")
      .select("*")
      .eq("id", trackId)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", TRACK_LOAD_FAILED, { cause: error });
    }

    return apiOk(data ? mapTrackRow(data) : null);
  } catch (error) {
    return apiFail<Track | null>(error, TRACK_LOAD_FAILED);
  }
}

/** Every rating for a track, oldest first. */
export async function listTrackRatings(trackId: string): Promise<ApiResponse<TrackRating[]>> {
  if (!isTrackId(trackId)) {
    return apiOk<TrackRating[]>([]);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("track_ratings")
      .select("*")
      .eq("track_id", trackId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new AppError("INTERNAL", RATINGS_LOAD_FAILED, { cause: error });
    }

    return apiOk((data ?? []).map(mapTrackRatingRow));
  } catch (error) {
    return apiFail<TrackRating[]>(error, RATINGS_LOAD_FAILED);
  }
}

/** The signed-in user's rating for a track, or null when they have not rated it. */
export async function getMyTrackRating(trackId: string): Promise<ApiResponse<number | null>> {
  if (!isTrackId(trackId)) {
    return apiOk<number | null>(null);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiOk<number | null>(null);
    }

    const { data, error } = await supabase
      .from("track_ratings")
      .select("rating")
      .eq("track_id", trackId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", RATINGS_LOAD_FAILED, { cause: error });
    }

    return apiOk<number | null>(data?.rating ?? null);
  } catch (error) {
    return apiFail<number | null>(error, RATINGS_LOAD_FAILED);
  }
}

/** Comments on a track, newest first. */
export async function listTrackComments(trackId: string): Promise<ApiResponse<TrackComment[]>> {
  if (!isTrackId(trackId)) {
    return apiOk<TrackComment[]>([]);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("track_comments")
      .select("*")
      .eq("track_id", trackId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError("INTERNAL", COMMENTS_LOAD_FAILED, { cause: error });
    }

    return apiOk((data ?? []).map(mapTrackCommentRow));
  } catch (error) {
    return apiFail<TrackComment[]>(error, COMMENTS_LOAD_FAILED);
  }
}

async function fetchRatingsByTrack(
  supabase: SupabaseClient<Database>,
  trackIds: string[],
): Promise<Map<string, number[]>> {
  const { data, error } = await supabase
    .from("track_ratings")
    .select("track_id, rating")
    .in("track_id", trackIds);

  if (error) {
    throw new AppError("INTERNAL", RATINGS_LOAD_FAILED, { cause: error });
  }

  const ratingsByTrack = new Map<string, number[]>();

  for (const row of data ?? []) {
    const values = ratingsByTrack.get(row.track_id) ?? [];
    values.push(row.rating);
    ratingsByTrack.set(row.track_id, values);
  }

  return ratingsByTrack;
}
