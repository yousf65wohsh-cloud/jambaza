import type { Track } from "@/types/track";

/**
 * Merges published catalog tracks with the current user's playlist tracks for
 * the room picker. De-duplicates by track id (first occurrence wins), drops
 * tracks without an audio path, and preserves the original order within and
 * across the two sources (published first, then playlist tracks).
 */
export function buildPickerTracks(published: Track[], playlistTracks: Track[]): Track[] {
  const seen = new Set<string>();
  const merged: Track[] = [];

  for (const track of [...published, ...playlistTracks]) {
    if (!track.audioPath) continue;
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    merged.push(track);
  }

  return merged;
}
