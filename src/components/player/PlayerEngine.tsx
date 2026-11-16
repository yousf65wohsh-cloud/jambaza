"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";

import { reportMyPresence } from "@/lib/friends/presence";
import { getOfflineBlob } from "@/lib/offline/files";
import { createClient } from "@/lib/supabase/client";
import { usePlayerStore } from "@/stores/player";

interface ResolvedAudio {
  trackId: string;
  url: string;
}

interface PlaybackFailure {
  trackId: string;
  message: string;
}

const AUDIO_SOURCE_ERROR = "تعذّر تجهيز ملف الصوت. تحقق من اتصالك ثم أعد المحاولة.";

/**
 * Plays uploaded tracks through a hidden <audio> element: IndexedDB blob first,
 * then a short-lived Supabase signed URL.
 *
 * The store is the single source of truth; the engine only mirrors it.
 */
export function PlayerEngine() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const volume = usePlayerStore((state) => state.volume);
  const seekNonce = usePlayerStore((state) => state.seekNonce);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<ResolvedAudio | null>(null);
  const pendingSeekRef = useRef<number | null>(null);

  const [resolvedAudio, setResolvedAudio] = useState<ResolvedAudio | null>(null);
  const [failure, setFailure] = useState<PlaybackFailure | null>(null);

  const trackId = currentTrack?.id ?? null;
  const audioPath = currentTrack?.sourceType === "upload" ? currentTrack.audioPath : null;

  const audioSrc = resolvedAudio?.trackId === trackId ? resolvedAudio.url : null;
  const error = failure?.trackId === trackId ? failure.message : null;

  // Best-effort "now listening" presence whenever a new track starts. A failed
  // write never blocks playback and is retried the next time a track changes.
  useEffect(() => {
    if (!trackId) return;

    void reportMyPresence(trackId);
  }, [trackId]);

  // Resolve an upload's audio source: IndexedDB first, signed URL otherwise.
  useEffect(() => {
    if (!trackId || !audioPath) return;

    let cancelled = false;

    async function resolve(id: string, path: string) {
      try {
        const blob = await getOfflineBlob(id);
        if (cancelled) return;

        if (blob) {
          const url = URL.createObjectURL(blob);
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current.url);
          }
          objectUrlRef.current = { trackId: id, url };
          setResolvedAudio({ trackId: id, url });
          return;
        }

        const { data, error: signedUrlError } = await createClient()
          .storage.from("audio")
          .createSignedUrl(path, 60 * 60);

        if (cancelled) return;

        if (signedUrlError || !data?.signedUrl) {
          throw signedUrlError ?? new Error("Missing signed URL");
        }

        setResolvedAudio({ trackId: id, url: data.signedUrl });
      } catch {
        if (!cancelled) {
          setFailure({ trackId: id, message: AUDIO_SOURCE_ERROR });
        }
      }
    }

    void resolve(trackId, audioPath);

    return () => {
      cancelled = true;
    };
  }, [trackId, audioPath]);

  // Revoke blob URLs on unmount.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current.url);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Keep the audio element volume in sync with the store.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, audioSrc]);

  // Mirror isPlaying to the audio element.
  useEffect(() => {
    if (!currentTrack || !audioSrc) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      void audio.play().catch(() => {
        // Autoplay can be blocked until the user interacts with the page.
        usePlayerStore.getState().pause();
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, audioSrc, currentTrack]);

  // Apply explicit seeks (player bar, room sync). The nonce prevents the
  // time-update loop from fighting user seeks.
  useEffect(() => {
    if (seekNonce === 0) return;

    const state = usePlayerStore.getState();
    const target = state.position;
    pendingSeekRef.current = target;

    const audio = audioRef.current;
    if (audio && audio.readyState >= 1) {
      audio.currentTime = target;
      pendingSeekRef.current = null;
    }
  }, [seekNonce]);

  function handleAudioMetadata(event: SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget;
    usePlayerStore
      .getState()
      .setDuration(Number.isFinite(audio.duration) ? audio.duration : null);

    if (pendingSeekRef.current !== null) {
      audio.currentTime = pendingSeekRef.current;
      pendingSeekRef.current = null;
    }
  }

  function handleAudioError() {
    if (!trackId) return;
    setFailure({ trackId, message: "تعذّر تشغيل ملف الصوت. قد يكون الملف تالفاً أو غير مدعوم." });
  }

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="bg-danger/15 border-danger/40 text-danger fixed bottom-[152px] left-1/2 z-50 w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-xl border px-3 py-2 text-xs shadow-lg md:bottom-[88px]"
        >
          {error}
        </p>
      ) : null}

      <audio
        ref={audioRef}
        src={audioSrc ?? undefined}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={handleAudioMetadata}
        onTimeUpdate={(event) => {
          usePlayerStore.getState().setPosition(event.currentTarget.currentTime);
        }}
        onEnded={() => {
          usePlayerStore.getState().next();
        }}
        onError={handleAudioError}
      />
    </>
  );
}
