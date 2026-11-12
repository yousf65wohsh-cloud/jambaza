import { usePlayerStore } from "@/stores/player";
import type { ListeningRoom } from "@/types/room";
import type { Track } from "@/types/track";

import { checkDrift } from "./drift";

/** Builds a queue-safe track descriptor for a room's YouTube video. */
export function createRoomTrack(room: ListeningRoom): Track {
  return {
    id: `room:${room.id}:${room.videoId}`,
    ownerId: room.hostId,
    title: "بث الغرفة المباشر",
    artist: "غرفة استماع",
    coverUrl: null,
    audioPath: null,
    durationSeconds: null,
    sourceType: "youtube",
    youtubeVideoId: room.videoId,
  };
}

export interface ApplyRoomResult {
  seeked: boolean;
  driftSeconds: number;
}

/**
 * Aligns the local player with the host's room state.
 * Only members call this — the host is already the source of truth.
 */
export function applyRoomPlayback(room: ListeningRoom): ApplyRoomResult {
  const state = usePlayerStore.getState();
  const current = state.currentTrack;
  const sameVideo =
    current?.sourceType === "youtube" && current.youtubeVideoId === room.videoId;

  // A different video (or no video yet): load it, then jump to the host's
  // position. The engine applies the pending seek once the player is ready.
  if (!sameVideo) {
    const track = createRoomTrack(room);
    state.setTrack(track, [track]);
    state.seek(room.positionSeconds);

    if (!room.isPlaying) {
      state.pause();
    }

    return { seeked: true, driftSeconds: 0 };
  }

  const drift = checkDrift({
    localSeconds: state.position,
    remoteSeconds: room.positionSeconds,
  });

  if (drift.shouldSeek) {
    state.seek(drift.targetSeconds);
  }

  if (room.isPlaying) {
    state.play();
  } else {
    state.pause();
  }

  return { seeked: drift.shouldSeek, driftSeconds: drift.driftSeconds };
}
