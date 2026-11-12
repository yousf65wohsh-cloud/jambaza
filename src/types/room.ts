import type { ListeningRoomRow } from "./database";

export interface ListeningRoom {
  id: string;
  hostId: string;
  videoId: string;
  isPlaying: boolean;
  positionSeconds: number;
  updatedAt: string;
}

export function mapListeningRoomRow(row: ListeningRoomRow): ListeningRoom {
  return {
    id: row.id,
    hostId: row.host_id,
    videoId: row.video_id,
    isPlaying: row.is_playing,
    positionSeconds: row.position_seconds,
    updatedAt: row.updated_at,
  };
}
