import { clamp } from "@/lib/utils";
import type { Track } from "@/types/track";

/** Broadcast event name and cadence for `room:{id}`. */
export const ROOM_SYNC_EVENT = "sync";
export const ROOM_BROADCAST_INTERVAL_MS = 5_000;

/** Never let a clock-skewed `sentAt` advance a member by minutes. */
const MAX_SENT_ELAPSED_SECONDS = ROOM_BROADCAST_INTERVAL_MS / 1_000;
/** Upper bound for estimating a room position from `updated_at`. */
const MAX_ROOM_AGE_SECONDS = 6 * 60 * 60;

export type RoomPlaybackState = "playing" | "paused";

export interface RoomTrackSnapshot {
  id: string;
  title: string;
  artist: string | null;
  coverUrl: string | null;
  durationSeconds: number | null;
}

/**
 * Host → members payload. `signedUrl` is included because the private audio
 * bucket only lets its owner sign a URL; members play the host-signed URL.
 */
export interface RoomSyncPayload {
  state: RoomPlaybackState;
  position: number;
  trackId: string | null;
  sentAt: number;
  signedUrl?: string | null;
  track?: RoomTrackSnapshot | null;
}

export interface RoomPositionInput {
  positionSeconds: number;
  isPlaying: boolean;
  updatedAt: string;
}

export function toRoomTrackSnapshot(track: Track): RoomTrackSnapshot {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    coverUrl: track.coverUrl,
    durationSeconds: track.durationSeconds,
  };
}

/**
 * A room row only stores the position at the last state change. While the host
 * is playing, estimate forward from `updated_at` so a newly opened member does
 * not start several minutes behind the host.
 */
export function estimateRoomPosition(
  room: RoomPositionInput,
  now: number = Date.now(),
): number {
  const base = Number.isFinite(room.positionSeconds)
    ? Math.max(0, room.positionSeconds)
    : 0;

  if (!room.isPlaying) return base;

  const updatedAt = Date.parse(room.updatedAt);
  if (!Number.isFinite(updatedAt)) return base;

  const elapsed = clamp(
    (now - updatedAt) / 1_000,
    0,
    MAX_ROOM_AGE_SECONDS,
  );

  return base + elapsed;
}

/**
 * Where the host should be now according to a Broadcast message. `sentAt` is
 * the host clock, so the elapsed part is clamped to one broadcast interval.
 */
export function expectedRemotePosition(
  payload: Pick<RoomSyncPayload, "state" | "position" | "sentAt">,
  now: number = Date.now(),
): number {
  const base = Number.isFinite(payload.position)
    ? Math.max(0, payload.position)
    : 0;

  if (payload.state !== "playing") return base;

  const elapsed = Number.isFinite(payload.sentAt)
    ? clamp((now - payload.sentAt) / 1_000, 0, MAX_SENT_ELAPSED_SECONDS)
    : 0;

  return base + elapsed;
}

function isTrackSnapshot(value: unknown): value is RoomTrackSnapshot {
  if (!value || typeof value !== "object") return false;

  const track = value as Record<string, unknown>;

  return (
    typeof track.id === "string" &&
    typeof track.title === "string" &&
    (track.artist === null || typeof track.artist === "string") &&
    (track.coverUrl === null || typeof track.coverUrl === "string") &&
    (track.durationSeconds === null || typeof track.durationSeconds === "number")
  );
}

/** Validates an untrusted Broadcast payload before it reaches the audio element. */
export function isRoomSyncPayload(value: unknown): value is RoomSyncPayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as Record<string, unknown>;

  if (payload.state !== "playing" && payload.state !== "paused") return false;
  if (typeof payload.position !== "number" || !Number.isFinite(payload.position)) {
    return false;
  }
  if (payload.trackId !== null && typeof payload.trackId !== "string") return false;
  if (typeof payload.sentAt !== "number" || !Number.isFinite(payload.sentAt)) {
    return false;
  }
  if (
    payload.signedUrl !== undefined &&
    payload.signedUrl !== null &&
    typeof payload.signedUrl !== "string"
  ) {
    return false;
  }
  if (
    payload.track !== undefined &&
    payload.track !== null &&
    !isTrackSnapshot(payload.track)
  ) {
    return false;
  }

  return true;
}
