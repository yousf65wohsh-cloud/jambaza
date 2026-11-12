"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";

import { getOfflineBlob } from "@/lib/offline/files";
import { createClient } from "@/lib/supabase/client";
import {
  loadYouTubeIframeApi,
  YOUTUBE_PLAYER_STATE,
  type YouTubePlayerInstance,
} from "@/lib/youtube";
import { usePlayerStore } from "@/stores/player";

import { VideoIcon } from "../ui/icons";

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
 * Owns both playback sources:
 *  - uploaded tracks via a hidden <audio> element (IndexedDB blob first, then
 *    a short-lived Supabase signed URL);
 *  - YouTube tracks via the official YouTube IFrame API in a visible panel.
 *
 * The store is the single source of truth; the engine only mirrors it.
 */
export function PlayerEngine() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const volume = usePlayerStore((state) => state.volume);
  const seekNonce = usePlayerStore((state) => state.seekNonce);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubeRef = useRef<YouTubePlayerInstance | null>(null);
  const objectUrlRef = useRef<ResolvedAudio | null>(null);
  const pendingSeekRef = useRef<number | null>(null);

  const [resolvedAudio, setResolvedAudio] = useState<ResolvedAudio | null>(null);
  const [failure, setFailure] = useState<PlaybackFailure | null>(null);

  const trackId = currentTrack?.id ?? null;
  const audioPath = currentTrack?.sourceType === "upload" ? currentTrack.audioPath : null;
  const youtubeVideoId =
    currentTrack?.sourceType === "youtube" ? (currentTrack.youtubeVideoId ?? null) : null;

  const audioSrc = resolvedAudio?.trackId === trackId ? resolvedAudio.url : null;
  const error = failure?.trackId === trackId ? failure.message : null;

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

  // Create the official YouTube player inside a ref-owned container.
  useEffect(() => {
    if (!youtubeVideoId) return;

    const videoId = youtubeVideoId;
    const activeTrackId = trackId ?? videoId;
    let cancelled = false;
    let player: YouTubePlayerInstance | null = null;
    let containerNode: HTMLDivElement | null = null;

    async function setup() {
      try {
        const api = await loadYouTubeIframeApi();
        if (cancelled) return;

        const container = youtubeContainerRef.current;
        if (!container) return;
        containerNode = container;

        // The IFrame API replaces its mount node with an iframe. Use a node
        // created imperatively so React never tries to manage that iframe.
        const mount = document.createElement("div");
        mount.className = "h-full w-full";
        container.replaceChildren(mount);

        player = new api.Player(mount, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              const state = usePlayerStore.getState();
              event.target.setVolume(Math.round(state.volume * 100));

              if (pendingSeekRef.current !== null) {
                event.target.seekTo(pendingSeekRef.current, true);
                pendingSeekRef.current = null;
              }

              if (state.isPlaying) event.target.playVideo();
              else event.target.pauseVideo();
            },
            onStateChange: (event) => {
              if (event.data === YOUTUBE_PLAYER_STATE.PLAYING) {
                usePlayerStore.getState().play();
              } else if (event.data === YOUTUBE_PLAYER_STATE.PAUSED) {
                usePlayerStore.getState().pause();
              } else if (event.data === YOUTUBE_PLAYER_STATE.ENDED) {
                const state = usePlayerStore.getState();
                if (state.queue.length > 1) {
                  state.next();
                } else {
                  event.target.seekTo(0, true);
                  event.target.playVideo();
                }
              }
            },
            onError: () => {
              setFailure({
                trackId: activeTrackId,
                message:
                  "تعذّر تشغيل فيديو يوتيوب. تأكد من أن الفيديو متاح للتضمين والاتصال بالإنترنت.",
              });
            },
          },
        });

        youtubeRef.current = player;
      } catch (cause) {
        if (!cancelled) {
          setFailure({
            trackId: activeTrackId,
            message: cause instanceof Error ? cause.message : "تعذّر تحميل مشغل يوتيوب.",
          });
        }
      }
    }

    void setup();

    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        // The iframe may already have been removed by React.
      }
      if (youtubeRef.current === player) {
        youtubeRef.current = null;
      }
      containerNode?.replaceChildren();
    };
  }, [youtubeVideoId, trackId]);

  // Keep volume in sync with both engines.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    youtubeRef.current?.setVolume(Math.round(volume * 100));
  }, [volume, audioSrc, youtubeVideoId]);

  // Mirror isPlaying to the active engine.
  useEffect(() => {
    if (!currentTrack) return;

    if (currentTrack.sourceType === "upload") {
      const audio = audioRef.current;
      if (!audio || !audioSrc) return;

      if (isPlaying) {
        void audio.play().catch(() => {
          // Autoplay can be blocked until the user interacts with the page.
          usePlayerStore.getState().pause();
        });
      } else {
        audio.pause();
      }
      return;
    }

    const player = youtubeRef.current;
    if (!player) return;

    if (isPlaying) player.playVideo();
    else player.pauseVideo();
  }, [isPlaying, audioSrc, currentTrack]);

  // Apply explicit seeks (player bar, room sync). The nonce prevents the
  // time-update loop from fighting user seeks.
  useEffect(() => {
    if (seekNonce === 0) return;

    const state = usePlayerStore.getState();
    const target = state.position;
    pendingSeekRef.current = target;

    if (state.currentTrack?.sourceType === "upload") {
      const audio = audioRef.current;
      if (audio && audio.readyState >= 1) {
        audio.currentTime = target;
        pendingSeekRef.current = null;
      }
      return;
    }

    const player = youtubeRef.current;
    if (player) {
      player.seekTo(target, true);
      pendingSeekRef.current = null;
    }
  }, [seekNonce]);

  // Poll the YouTube player while it plays so the progress bar advances.
  useEffect(() => {
    if (!youtubeVideoId || !isPlaying) return;

    const interval = window.setInterval(() => {
      const player = youtubeRef.current;
      if (!player) return;

      const time = player.getCurrentTime();
      if (Number.isFinite(time)) {
        usePlayerStore.getState().setPosition(time);
      }

      const total = player.getDuration();
      if (Number.isFinite(total) && total > 0) {
        usePlayerStore.getState().setDuration(total);
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [youtubeVideoId, isPlaying]);

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
      {youtubeVideoId && currentTrack ? (
        <section
          aria-label="مشغل يوتيوب المرئي"
          className="border-border bg-background fixed end-3 bottom-[152px] z-40 w-[min(22.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border shadow-2xl md:bottom-[88px]"
        >
          <div className="border-border/70 bg-surface flex items-center justify-between border-b px-3 py-1.5">
            <span className="text-muted flex items-center gap-1.5 text-[11px] font-medium">
              <VideoIcon className="size-3.5" />
              مشغل يوتيوب المرئي
            </span>
            <span className="text-muted text-[11px]">يوتيوب</span>
          </div>
          <div ref={youtubeContainerRef} className="aspect-video w-full bg-black" />
        </section>
      ) : null}

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
