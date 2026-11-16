"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { getPlaylist, listMyPlaylists } from "@/lib/playlists/data";
import { listTracks } from "@/lib/tracks/data";
import type { PlaylistDetails } from "@/types/playlist";
import type { Track } from "@/types/track";

interface RoomTrackPickerProps {
  currentTrackId: string | null;
  disabled?: boolean;
  onSelect: (track: Track) => void;
}

interface PlaylistGroup {
  playlist: PlaylistDetails;
  tracks: Track[];
}

function isPlayableUpload(track: Track): boolean {
  return track.sourceType === "upload" && Boolean(track.audioPath);
}

function trackLabel(track: Track): string {
  return track.artist ? `${track.title} — ${track.artist}` : track.title;
}

/**
 * Host track picker. Sources are the host's own uploaded catalog and their
 * personal playlists.
 *
 * Only the host can sign a URL for the private audio bucket under the current
 * owner-only storage policy, so tracks owned by other users are intentionally
 * filtered out instead of failing at playback time.
 */
export function RoomTrackPicker({
  currentTrackId,
  disabled = false,
  onSelect,
}: RoomTrackPickerProps) {
  const selectId = useId();
  const [library, setLibrary] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const [libraryResult, playlistsResult] = await Promise.all([
        listTracks({ limit: 50 }),
        listMyPlaylists(),
      ]);

      if (!active) return;

      if (!libraryResult.ok) {
        setError(libraryResult.error.message);
        setLoading(false);
        return;
      }

      setLibrary(libraryResult.data.tracks.filter(isPlayableUpload));

      if (!playlistsResult.ok) {
        setError(playlistsResult.error.message);
        setLoading(false);
        return;
      }

      const details = await Promise.all(
        playlistsResult.data.map((playlist) => getPlaylist(playlist.id)),
      );

      if (!active) return;

      const groups: PlaylistGroup[] = [];

      for (const result of details) {
        if (!result.ok || !result.data) continue;

        const playlist = result.data;
        const tracks = playlist.tracks.filter(isPlayableUpload);

        if (tracks.length > 0) {
          groups.push({ playlist, tracks });
        }
      }

      setPlaylists(groups);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const tracksById = useMemo(() => {
    const map = new Map<string, Track>();

    for (const track of library) {
      map.set(track.id, track);
    }

    for (const group of playlists) {
      for (const track of group.tracks) {
        map.set(track.id, track);
      }
    }

    return map;
  }, [library, playlists]);

  const hasTracks = library.length > 0 || playlists.length > 0;

  if (loading) {
    return <p className="text-muted text-xs">جارٍ تحميل المقاطع المتاحة…</p>;
  }

  if (error) {
    return (
      <p role="alert" className="text-danger text-xs">
        {error}
      </p>
    );
  }

  if (!hasTracks) {
    return (
      <p className="text-muted text-xs leading-5">
        لا توجد مقاطع مرفوعة في مكتبتك أو قوائم التشغيل. ارفع مقطعاً من صفحة المكتبة أولاً.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="block text-xs font-medium">
        مقطع الغرفة
      </label>
      <select
        id={selectId}
        className="field"
        value={currentTrackId ?? ""}
        disabled={disabled}
        onChange={(event) => {
          const track = tracksById.get(event.target.value);
          if (track) onSelect(track);
        }}
      >
        <option value="">اختر مقطعاً…</option>

        {library.length > 0 ? (
          <optgroup label="من مكتبتك (الكتالوج)">
            {library.map((track) => (
              <option key={`library:${track.id}`} value={track.id}>
                {trackLabel(track)}
              </option>
            ))}
          </optgroup>
        ) : null}

        {playlists.map((group) => (
          <optgroup key={group.playlist.id} label={`قائمة: ${group.playlist.name}`}>
            {group.tracks.map((track) => (
              <option key={`${group.playlist.id}:${track.id}`} value={track.id}>
                {trackLabel(track)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
