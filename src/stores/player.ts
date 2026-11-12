import { create } from "zustand";

import type { Track } from "@/types/track";
import { clamp } from "@/lib/utils";

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  position: number;
  duration: number | null;
  volume: number;
  /** Incremented whenever a seek is requested; consumed by the engine. */
  seekNonce: number;
  setTrack: (track: Track, queue?: Track[]) => void;
  setQueue: (queue: Track[]) => void;
  setDuration: (seconds: number | null) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setPosition: (seconds: number) => void;
  setVolume: (volume: number) => void;
  clear: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  position: 0,
  duration: null,
  volume: 0.8,
  seekNonce: 0,

  setTrack: (track, queue) =>
    set((state) => {
      const alreadyQueued = state.queue.some((item) => item.id === track.id);
      const nextQueue = queue && queue.length > 0 ? queue : alreadyQueued ? state.queue : [track];

      return {
        currentTrack: track,
        queue: nextQueue,
        isPlaying: true,
        position: 0,
        duration: track.durationSeconds ?? null,
        seekNonce: 0,
      };
    }),

  setQueue: (queue) => set({ queue }),

  setDuration: (seconds) => {
    if (seconds === null) {
      set({ duration: null });
      return;
    }
    if (Number.isFinite(seconds) && seconds > 0) {
      set({ duration: seconds });
    }
  },

  play: () => {
    if (!get().currentTrack) return;
    if (!get().isPlaying) set({ isPlaying: true });
  },

  pause: () => {
    if (get().isPlaying) set({ isPlaying: false });
  },

  togglePlay: () => {
    if (!get().currentTrack) return;
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  next: () => {
    const { currentTrack, queue } = get();
    if (!currentTrack || queue.length === 0) return;

    const index = queue.findIndex((item) => item.id === currentTrack.id);
    const nextTrack = queue[index >= 0 && index < queue.length - 1 ? index + 1 : 0];
    if (!nextTrack) return;

    set({
      currentTrack: nextTrack,
      isPlaying: true,
      position: 0,
      duration: nextTrack.durationSeconds ?? null,
      seekNonce: 0,
    });
  },

  previous: () => {
    const { currentTrack, queue, position } = get();
    if (!currentTrack) return;

    // Standard behaviour: restart the current track if we are past 3 seconds.
    if (position > 3) {
      get().seek(0);
      return;
    }

    const index = queue.findIndex((item) => item.id === currentTrack.id);
    const previousTrack = index > 0 ? queue[index - 1] : queue[queue.length - 1];
    if (!previousTrack) {
      get().seek(0);
      return;
    }

    set({
      currentTrack: previousTrack,
      isPlaying: true,
      position: 0,
      duration: previousTrack.durationSeconds ?? null,
      seekNonce: 0,
    });
  },

  seek: (seconds) => {
    const { duration, seekNonce } = get();
    const target = clamp(seconds, 0, duration ?? Number.MAX_SAFE_INTEGER);
    set({ position: target, seekNonce: seekNonce + 1 });
  },

  setPosition: (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    set({ position: seconds });
  },

  setVolume: (volume) => {
    if (!Number.isFinite(volume)) return;
    set({ volume: clamp(volume, 0, 1) });
  },

  clear: () =>
    set({
      currentTrack: null,
      queue: [],
      isPlaying: false,
      position: 0,
      duration: null,
      seekNonce: 0,
    }),
}));
