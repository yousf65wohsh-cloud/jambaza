"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { clamp } from "@/lib/utils";
import { mapTrackRow, type Track } from "@/types/track";
import {
  mapListeningRoomRow,
  type ListeningRoom,
} from "@/types/room";
import type { ListeningRoomRow } from "@/types/database";

export type RealtimeStatus = "connecting" | "connected" | "error";

/** Short-lived signed URL lifetime for the private audio bucket. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const ROOM_LOAD_FAILED = "تعذّر تحميل غرفة الاستماع. حاول مرة أخرى.";
const ROOM_NOT_FOUND = "لم يتم العثور على الغرفة، أو أنك لست عضواً فيها.";
const TRACK_LOAD_FAILED = "تعذّر تحميل مقطع الغرفة. حاول مرة أخرى.";
const AUDIO_SIGN_FAILED = "تعذّر تجهيز رابط الصوت. تحقق من اتصالك ثم أعد المحاولة.";
const AUDIO_PLAY_FAILED = "تعذّر تشغيل ملف الصوت. قد يكون الملف تالفاً أو غير مدعوم.";

export interface RoomTrackSnapshot {
  id: string;
  title: string;
  artist: string | null;
  coverUrl: string | null;
  durationSeconds: number | null;
}

export interface UseRoomSyncResult {
  room: ListeningRoom | null;
  userId: string | null;
  isHost: boolean;
  loading: boolean;
  error: string | null;
  realtimeStatus: RealtimeStatus;
  isSyncing: boolean;
  notice: string | null;
  track: RoomTrackSnapshot | null;
  isPlaying: boolean;
  position: number;
  duration: number | null;
  needsGesture: boolean;
  syncNow: () => Promise<void>;
  selectTrack: (track: Track) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  retryPlayback: () => Promise<void>;
}

function toTrackSnapshot(track: Track): RoomTrackSnapshot {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    coverUrl: track.coverUrl,
    durationSeconds: track.durationSeconds,
  };
}

/**
 * Loads one listening room, resolves the selected Storage track to a signed
 * URL, and lets the host drive an <audio> element.
 *
 * The host is the only writer. Members receive state from Database changes in
 * this step; Broadcast position sync is layered on next.
 */
export function useRoomSync(
  roomId: string,
  audioRef: RefObject<HTMLAudioElement | null>,
): UseRoomSyncResult {
  const [room, setRoom] = useState<ListeningRoom | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const [isSyncing, setIsSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [track, setTrack] = useState<RoomTrackSnapshot | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [needsGesture, setNeedsGesture] = useState(false);

  const userIdRef = useRef<string | null>(null);
  const isHostRef = useRef(false);
  const currentTrackRef = useRef<Track | null>(null);
  const signedUrlRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  const positionRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);
  const playOnLoadRef = useRef(false);
  const busyRef = useRef(false);

  const startAudio = useCallback(async (): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio) return false;

    try {
      await audio.play();
      setNeedsGesture(false);
      return true;
    } catch {
      setNeedsGesture(true);
      return false;
    }
  }, [audioRef]);

  const persistHostState = useCallback(
    async (update: {
      track_id?: string | null;
      is_playing?: boolean;
      position_seconds?: number;
    }): Promise<boolean> => {
      try {
        const { data, error: updateError } = await createClient()
          .from("listening_rooms")
          .update(update)
          .eq("id", roomId)
          .select("*")
          .single();

        if (updateError || !data) {
          setError("تعذّر تحديث حالة الغرفة. تأكد من أنك المضيف وحاول مجدداً.");
          return false;
        }

        setRoom(mapListeningRoomRow(data));
        return true;
      } catch {
        setError("تعذّر تحديث حالة الغرفة. تحقق من اتصالك بالإنترنت.");
        return false;
      }
    },
    [roomId],
  );

  const loadHostTrack = useCallback(
    async (
      trackId: string,
      options: { position: number; autoplay: boolean },
    ): Promise<boolean> => {
      const supabase = createClient();
      const { data, error: trackError } = await supabase
        .from("tracks")
        .select("*")
        .eq("id", trackId)
        .maybeSingle();

      if (trackError || !data) {
        setError(TRACK_LOAD_FAILED);
        return false;
      }

      const resolved = mapTrackRow(data);

      if (resolved.sourceType !== "upload" || !resolved.audioPath) {
        setError("مقطع الغرفة يجب أن يكون ملفاً صوتياً مرفوعاً إلى التخزين.");
        return false;
      }

      const { data: signed, error: signError } = await supabase.storage
        .from("audio")
        .createSignedUrl(resolved.audioPath, SIGNED_URL_TTL_SECONDS);

      if (signError || !signed?.signedUrl) {
        setError(AUDIO_SIGN_FAILED);
        return false;
      }

      const safePosition = Math.max(0, options.position);

      currentTrackRef.current = resolved;
      signedUrlRef.current = signed.signedUrl;
      positionRef.current = safePosition;
      isPlayingRef.current = options.autoplay;

      setTrack(toTrackSnapshot(resolved));
      setPosition(safePosition);
      setIsPlaying(options.autoplay);

      const audio = audioRef.current;
      if (audio) {
        pendingSeekRef.current = safePosition;
        playOnLoadRef.current = options.autoplay;
        audio.src = signed.signedUrl;
        audio.load();
      }

      return true;
    },
    [audioRef],
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    async function load() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError || !user) {
          setError("يجب تسجيل الدخول للوصول إلى غرفة الاستماع.");
          setLoading(false);
          setRealtimeStatus("error");
          return;
        }

        userIdRef.current = user.id;
        setUserId(user.id);

        const { data, error: roomError } = await supabase
          .from("listening_rooms")
          .select("*")
          .eq("id", roomId)
          .maybeSingle();

        if (cancelled) return;

        if (roomError) {
          setError(ROOM_LOAD_FAILED);
          setLoading(false);
          return;
        }

        if (!data) {
          setError(ROOM_NOT_FOUND);
          setLoading(false);
          return;
        }

        const mapped = mapListeningRoomRow(data);
        const host = mapped.hostId === user.id;

        isHostRef.current = host;
        setRoom(mapped);
        setIsPlaying(mapped.isPlaying);
        isPlayingRef.current = mapped.isPlaying;
        positionRef.current = mapped.positionSeconds;
        setPosition(mapped.positionSeconds);

        if (host && mapped.trackId) {
          await loadHostTrack(mapped.trackId, {
            position: mapped.positionSeconds,
            autoplay: mapped.isPlaying,
          });
        }

        if (cancelled) return;

        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.");
          setLoading(false);
          setRealtimeStatus("error");
        }
      }
    }

    void load();

    channel = supabase
      .channel(`listening-room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "listening_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const remote = mapListeningRoomRow(payload.new as ListeningRoomRow);
          setRoom(remote);

          if (!isHostRef.current) {
            setIsPlaying(remote.isPlaying);
            isPlayingRef.current = remote.isPlaying;
            positionRef.current = remote.positionSeconds;
            setPosition(remote.positionSeconds);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("error");
        }
      });

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadHostTrack, roomId]);

  // Keep the audio element's time and metadata mirrored into React state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const element: HTMLAudioElement = audio;

    function handleTimeUpdate() {
      const current = element.currentTime;
      positionRef.current = current;
      setPosition(current);
    }

    function handleLoadedMetadata() {
      setDuration(Number.isFinite(element.duration) ? element.duration : null);

      if (pendingSeekRef.current !== null) {
        const target = pendingSeekRef.current;
        pendingSeekRef.current = null;

        try {
          element.currentTime = target;
        } catch {
          // The source may not support seeking; playback still starts.
        }
      }

      if (playOnLoadRef.current) {
        playOnLoadRef.current = false;
        void startAudio();
      }
    }

    function handleEnded() {
      if (!isHostRef.current) return;

      isPlayingRef.current = false;
      positionRef.current = 0;
      setIsPlaying(false);
      setPosition(0);
      void persistHostState({ is_playing: false, position_seconds: 0 });
    }

    function handleError() {
      if (!element.src) return;
      setError(AUDIO_PLAY_FAILED);
    }

    element.addEventListener("timeupdate", handleTimeUpdate);
    element.addEventListener("loadedmetadata", handleLoadedMetadata);
    element.addEventListener("ended", handleEnded);
    element.addEventListener("error", handleError);

    return () => {
      element.removeEventListener("timeupdate", handleTimeUpdate);
      element.removeEventListener("loadedmetadata", handleLoadedMetadata);
      element.removeEventListener("ended", handleEnded);
      element.removeEventListener("error", handleError);
    };
  }, [audioRef, persistHostState, startAudio]);

  const play = useCallback(async () => {
    if (!isHostRef.current || !currentTrackRef.current) return;

    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(true);
    isPlayingRef.current = true;
    await startAudio();

    await persistHostState({
      is_playing: true,
      position_seconds: Math.max(0, audio.currentTime),
    });
  }, [audioRef, persistHostState, startAudio]);

  const pause = useCallback(async () => {
    if (!isHostRef.current || !currentTrackRef.current) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;

    await persistHostState({
      is_playing: false,
      position_seconds: Math.max(0, audio.currentTime),
    });
  }, [audioRef, persistHostState]);

  const togglePlay = useCallback(async () => {
    if (isPlayingRef.current) {
      await pause();
    } else {
      await play();
    }
  }, [pause, play]);

  const seek = useCallback(
    async (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      const max =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : Number.MAX_SAFE_INTEGER;
      const target = clamp(seconds, 0, max);

      try {
        audio.currentTime = target;
      } catch {
        // Leave the element where it is when the source cannot seek.
      }

      positionRef.current = target;
      setPosition(target);

      if (isHostRef.current) {
        await persistHostState({ position_seconds: target });
      }
    },
    [audioRef, persistHostState],
  );

  const selectTrack = useCallback(
    async (next: Track) => {
      if (!isHostRef.current || busyRef.current) return;

      if (next.sourceType !== "upload" || !next.audioPath) {
        setError("اختر مقطعاً صوتياً مرفوعاً إلى التخزين.");
        return;
      }

      const supabase = createClient();

      setError(null);
      setNotice(null);
      busyRef.current = true;
      setIsSyncing(true);

      try {
        const { data: signed, error: signError } = await supabase.storage
          .from("audio")
          .createSignedUrl(next.audioPath, SIGNED_URL_TTL_SECONDS);

        if (signError || !signed?.signedUrl) {
          setError(AUDIO_SIGN_FAILED);
          return;
        }

        currentTrackRef.current = next;
        signedUrlRef.current = signed.signedUrl;
        positionRef.current = 0;
        isPlayingRef.current = true;

        setTrack(toTrackSnapshot(next));
        setPosition(0);
        setIsPlaying(true);

        const audio = audioRef.current;
        if (audio) {
          pendingSeekRef.current = 0;
          playOnLoadRef.current = true;
          audio.src = signed.signedUrl;
          audio.load();
        }

        const persisted = await persistHostState({
          track_id: next.id,
          is_playing: true,
          position_seconds: 0,
        });

        if (persisted) {
          setNotice("تم تشغيل المقطع في الغرفة.");
        }
      } catch {
        setError(AUDIO_SIGN_FAILED);
      } finally {
        busyRef.current = false;
        setIsSyncing(false);
      }
    },
    [audioRef, persistHostState],
  );

  const syncNow = useCallback(async () => {
    if (!isHostRef.current) {
      setNotice("أنت عضو في الغرفة، وستصل حالة التشغيل من المضيف تلقائياً.");
      return;
    }

    const audio = audioRef.current;
    const persisted = await persistHostState({
      is_playing: isPlayingRef.current,
      position_seconds: Math.max(0, audio?.currentTime ?? positionRef.current),
    });

    if (persisted) {
      setNotice("تمت مزامنة حالة التشغيل مع الأعضاء.");
    }
  }, [audioRef, persistHostState]);

  const retryPlayback = useCallback(async () => {
    await startAudio();
  }, [startAudio]);

  return {
    room,
    userId,
    isHost: Boolean(userId && room && room.hostId === userId),
    loading,
    error,
    realtimeStatus,
    isSyncing,
    notice,
    track,
    isPlaying,
    position,
    duration,
    needsGesture,
    syncNow,
    selectTrack,
    play,
    pause,
    togglePlay,
    seek,
    retryPlayback,
  };
}
