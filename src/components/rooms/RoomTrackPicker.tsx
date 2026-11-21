"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { getPlaylist, listMyPlaylists } from "@/lib/playlists/data";
import { listPublishedForPicker } from "@/lib/rooms/data";
import { buildPickerTracks } from "@/lib/rooms/picker";
import { createClient } from "@/lib/supabase/client";
import type { Track } from "@/types/track";

interface RoomTrackPickerProps {
  currentTrackId: string | null;
  /** Host id for the room; kept for call-site compatibility. */
  ownerId: string;
  disabled?: boolean;
  onSelect: (track: Track) => void;
}

function trackLabel(track: Track): string {
  return track.artist ? `${track.title} — ${track.artist}` : track.title;
}

function canPickTrack(track: Track, currentUserId: string | null): boolean {
  return Boolean(track.audioPath) && (track.isPublished || track.ownerId === currentUserId);
}

/**
 * Host track picker. Sources are published catalog tracks and the host's own
 * playlist tracks. Tracks without a playable audio path are excluded. Published
 * tracks from other owners are allowed; unpublished tracks from other owners
 * are excluded.
 */
export function RoomTrackPicker({
  currentTrackId,
  disabled = false,
  onSelect,
}: RoomTrackPickerProps) {
  const selectId = useId();
  const [published, setPublished] = useState<Track[]>([]);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ?? null;

      const [publishedResult, playlistsResult] = await Promise.all([
        listPublishedForPicker({ limit: 50 }),
        listMyPlaylists(),
      ]);

      if (!active) return;

      setCurrentUserId(userId);

      if (!publishedResult.ok) {
        setLoadError(publishedResult.error.message);
        setPublished([]);
        setPlaylistTracks([]);
        setLoading(false);
        return;
      }

      if (!playlistsResult.ok) {
        setLoadError(playlistsResult.error.message);
        setPublished(publishedResult.data);
        setPlaylistTracks([]);
        setLoading(false);
        return;
      }

      const details = await Promise.all(
        playlistsResult.data.map((playlist) => getPlaylist(playlist.id)),
      );

      if (!active) return;

      const ownPlaylistTracks: Track[] = [];
      for (const result of details) {
        if (!result.ok || !result.data) continue;
        ownPlaylistTracks.push(...result.data.tracks);
      }

      setPublished(publishedResult.data);
      setPlaylistTracks(ownPlaylistTracks);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const publishedGroup = useMemo(() => {
    const seen = new Set<string>();
    return buildPickerTracks(published, []).filter((track) => {
      if (!canPickTrack(track, currentUserId)) return false;
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    });
  }, [currentUserId, published]);

  const playlistGroup = useMemo(() => {
    const publishedIds = new Set(publishedGroup.map((track) => track.id));
    const seen = new Set<string>();
    return buildPickerTracks([], playlistTracks).filter((track) => {
      if (publishedIds.has(track.id)) return false;
      if (!canPickTrack(track, currentUserId)) return false;
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    });
  }, [currentUserId, playlistTracks, publishedGroup]);

  const tracksById = useMemo(() => {
    const map = new Map<string, Track>();
    for (const track of [...publishedGroup, ...playlistGroup]) {
      map.set(track.id, track);
    }
    return map;
  }, [playlistGroup, publishedGroup]);

  const hasTracks = tracksById.size > 0;

  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="text-muted text-[11px] font-medium">
        اختر مقطعاً للجلسة
      </label>

      {loadError ? (
        <p role="alert" className="text-danger text-xs">
          {loadError}
        </p>
      ) : null}

      <select
        id={selectId}
        value={currentTrackId ?? ""}
        disabled={disabled || loading || !hasTracks}
        onChange={(event) => {
          const track = tracksById.get(event.target.value);

          if (track) {
            onSelect(track);
          }
        }}
        className="border-border bg-surface-2 text-foreground focus-visible:outline-accent w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <option value="">جارٍ تحميل المقاطع…</option>
        ) : hasTracks ? (
          <>
            <option value="">اختر مقطعاً…</option>

            {publishedGroup.length > 0 ? (
              <optgroup label="منشورة">
                {publishedGroup.map((track) => (
                  <option key={`published:${track.id}`} value={track.id}>
                    {trackLabel(track)}
                  </option>
                ))}
              </optgroup>
            ) : null}

            {playlistGroup.length > 0 ? (
              <optgroup label="من قوائمي">
                {playlistGroup.map((track) => (
                  <option key={`playlist:${track.id}`} value={track.id}>
                    {trackLabel(track)}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </>
        ) : (
          <option value="">لا توجد مقاطع يمكنك مشاركتها حالياً.</option>
        )}
      </select>

      {!loading && !hasTracks ? (
        <p className="text-muted text-[11px] leading-4">
          شارك مقطعاً من مكتبتك أو قوائمك ليظهر هنا.
        </p>
      ) : null}
    </div>
  );
}
