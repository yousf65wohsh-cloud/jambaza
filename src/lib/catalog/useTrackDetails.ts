"use client";

import { useEffect, useState } from "react";

import {
  getMyTrackRating,
  getTrack,
  hasCatalogSession,
  listTrackComments,
  listTrackRatings,
} from "@/lib/catalog/data";
import type { Track, TrackComment } from "@/types/track";

export interface TrackDetailsState {
  loading: boolean;
  hasSession: boolean | null;
  /** `undefined` means "not resolved yet", `null` means "not found". */
  track: Track | null | undefined;
  ratings: number[];
  myRating: number | null;
  comments: TrackComment[];
  error: string | null;
  ratingsError: string | null;
  commentsError: string | null;
  reload: () => void;
}

/**
 * Loads everything the track details views need. Shared by the standalone
 * `/tracks` page and the music details panel so the fetching logic lives once.
 */
export function useTrackDetails(trackId: string): TrackDetailsState {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [track, setTrack] = useState<Track | null | undefined>(undefined);
  const [ratings, setRatings] = useState<number[]>([]);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [comments, setComments] = useState<TrackComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ratingsError, setRatingsError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      setRatingsError(null);
      setCommentsError(null);

      const session = await hasCatalogSession();
      if (!active) return;
      setHasSession(session);

      if (!session) {
        setLoading(false);
        return;
      }

      if (!trackId) {
        setTrack(null);
        setLoading(false);
        return;
      }

      const [trackResult, ratingsResult, commentsResult, myRatingResult] = await Promise.all([
        getTrack(trackId),
        listTrackRatings(trackId),
        listTrackComments(trackId),
        getMyTrackRating(trackId),
      ]);
      if (!active) return;

      if (!trackResult.ok) {
        setError(trackResult.error.message);
        setTrack(undefined);
        setLoading(false);
        return;
      }

      setTrack(trackResult.data);

      if (ratingsResult.ok) {
        setRatings(ratingsResult.data.map((rating) => rating.rating));
      } else {
        setRatingsError(ratingsResult.error.message);
        setRatings([]);
      }

      if (commentsResult.ok) {
        setComments(commentsResult.data);
      } else {
        setCommentsError(commentsResult.error.message);
        setComments([]);
      }

      setMyRating(myRatingResult.ok ? myRatingResult.data : null);

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [trackId, reloadKey]);

  return {
    loading,
    hasSession,
    track,
    ratings,
    myRating,
    comments,
    error,
    ratingsError,
    commentsError,
    reload: () => setReloadKey((current) => current + 1),
  };
}
