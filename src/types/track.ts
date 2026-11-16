import type { TrackCommentRow, TrackRatingRow, TrackRow, TrackSource } from "./database";

/**
 * A playable track. Mirrors `public.tracks` but is safe to keep in the
 * client-side queue (serializable, no blobs).
 */
export interface Track {
  id: string;
  ownerId: string;
  title: string;
  artist: string | null;
  coverUrl: string | null;
  audioPath: string | null;
  durationSeconds: number | null;
  sourceType: TrackSource;
  youtubeVideoId: string | null;
  description: string | null;
  credits: string | null;
  releaseDate: string | null;
  isPublished: boolean;
}

/** A catalog track together with its aggregate rating. */
export interface RatedTrack extends Track {
  averageRating: number;
  ratingCount: number;
}

export interface TrackRating {
  userId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrackComment {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
}

export function mapTrackRow(row: TrackRow): Track {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    artist: row.artist,
    coverUrl: row.cover_url,
    audioPath: row.audio_path,
    durationSeconds: row.duration_seconds,
    sourceType: row.source_type,
    youtubeVideoId: row.youtube_video_id,
    description: row.description,
    credits: row.credits,
    releaseDate: row.release_date,
    isPublished: row.is_published,
  };
}

export function mapTrackRatingRow(row: TrackRatingRow): TrackRating {
  return {
    userId: row.user_id,
    rating: row.rating,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTrackCommentRow(row: TrackCommentRow): TrackComment {
  return {
    id: row.id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function isUploadTrack(track: Track): boolean {
  return track.sourceType === "upload";
}
