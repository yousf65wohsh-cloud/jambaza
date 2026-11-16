import type { PlaylistRow } from "./database";
import type { Track } from "./track";

/** A personal playlist with its number of tracks. */
export interface Playlist {
  id: string;
  ownerId: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  trackCount: number;
}

/** A playlist together with its tracks in playlist order. */
export interface PlaylistDetails extends Playlist {
  tracks: Track[];
}

export function mapPlaylistRow(row: PlaylistRow, trackCount = 0): Playlist {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    trackCount,
  };
}
