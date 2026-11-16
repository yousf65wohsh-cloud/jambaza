"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { clamp } from "@/lib/utils";
import { mapTrackRow, type Track } from "@/types/track";
import { mapListeningRoomRow, type ListeningRoom } from "@/types/room";

import { checkDrift } from "./drift";
import {
  ROOM_BROADCAST_INTERVAL_MS,
  ROOM_SYNC_EVENT,
  estimateRoomPosition,
  expectedRemotePosition,
  isRoomSyncPayload,
  toRoomTrackSnapshot,
  type RoomSyncPayload,
  type RoomTrackSnapshot,
} from "./sync";

export type RealtimeStatus = "connecting" | "connected" | "error";

/** Signed URL lifetime for the private audio bucket. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const ROOM_LOAD_FAILED = "تعذّر تحميل غرفة الاستماع. حاول مرة أخرى.";
const ROOM_NOT_FOUND = "لم يتم العثور على الغرفة، أو أنك لست عضواً فيها.";
const TRACK_LOAD_FAILED = "تعذّر تحميل مقطع الغرفة. حاول مرة أخرى.";
const AUDIO_SIGN_FAILED = "تعذّر تجهيز رابط الصوت. تحقق من اتصالك ثم أعد المحاولة.";
const AUDIO_PLAY_FAILED = "تعذّر تشغيل ملف الصوت. قد يكون الملف تالفاً أو غير مدعوم.";
const WAITING_FOR_URL = "بانتظار رابط الصوت من المضيف…";

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
  selectTrack: (track: Track) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlay: () => Promise<void>;
  /** Moves the audio element for a live drag without writing to the database. */
  previewSeek: (seconds: number) => void;
  /** Commits one seek to the database and Broadcast when the drag ends. */
  commitSeek: (seconds: number) => Promise<void>;
  retryPlayback: () => Promise<void>;
}

function seekTarget(audio: HTMLAudioElement, seconds: number): number {
  const safe = Number.isFinite(seconds) ? seconds : audio.currentTime;
  const max =
    Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : Number.MAX_SAFE_INTEGER;

  return clamp(safe, 0, max);
}

/**
 * Room playback synced over Supabase Realtime Broadcast on `room:{id}`.
 *
 * The host is the single source of truth: only the host writes to
 * `listening_rooms`, and only when playback state changes (track, play, pause,
 * seek, end). Position updates go out over Broadcast every 5 seconds instead of
 * being written to the database.
 *
 * Members never publish. They apply the host's track/state immediately and only
 * seek when the position drifts by more than two seconds (`checkDrift`).
 *
 * The private audio bucket permits owner-only signing, so the host signs the
 * track URL and includes it in the Broadcast payload.
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

  const isHost = Boolean(userId && room && room.hostId === userId);

  const userIdRef = useRef<string | null>(null);
  const isHostRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const signedUrlRef = useRef<string | null>(null);
  /** Track id whose URL is currently assigned to the audio element. */
  const audioTrackIdRef = useRef<string | null>(null);
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

  /** Broadcast helper: no database writes happen here. */
  const broadcastNow = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;

    const audio = audioRef.current;
    const payload: RoomSyncPayload = {
      state: isPlayingRef.current ? "playing" : "paused",
      position: Math.max(0, audio?.currentTime ?? positionRef.current),
      trackId: currentTrackRef.current?.id ?? null,
      sentAt: Date.now(),
      signedUrl: signedUrlRef.current,
      track: currentTrackRef.current
        ? toRoomTrackSnapshot(currentTrackRef.current)
        : null,
    };

    void channel.send({
      type: "broadcast",
      event: ROOM_SYNC_EVENT,
      payload,
    });
  }, [audioRef]);

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
      audioTrackIdRef.current = resolved.id;
      positionRef.current = safePosition;
      isPlayingRef.current = options.autoplay;

      setTrack(toRoomTrackSnapshot(resolved));
      setPosition(safePosition);
      setIsPlaying(options.autoplay);

      const audio = audioRef.current;
      if (audio) {
        pendingSeekRef.current = safePosition;
        playOnLoadRef.current = options.autoplay;
        audio.src = signed.signedUrl;
        audio.load();
      }

      // Announce as soon as the initial track/URL is ready. If the channel is
      // not subscribed yet, the connected effect broadcasts instead.
      broadcastNow();

      return true;
    },
    [audioRef, broadcastNow],
  );

  const applyRemote = useCallback(
    (payload: RoomSyncPayload) => {
      if (isHostRef.current) return;

      const audio = audioRef.current;
      const target = expectedRemotePosition(payload);

      isPlayingRef.current = payload.state === "playing";
      positionRef.current = target;
      setIsPlaying(payload.state === "playing");
      setPosition(target);
      setRoom((current) =>
        current
          ? {
              ...current,
              trackId: payload.trackId,
              isPlaying: payload.state === "playing",
              positionSeconds: target,
            }
          : current,
      );

      if (payload.track) {
        setTrack(payload.track);
      } else if (payload.trackId) {
        setTrack({
          id: payload.trackId,
          title: "مقطع الغرفة",
          artist: null,
          coverUrl: null,
          durationSeconds: null,
        });
      } else {
        setTrack(null);
      }

      if (!payload.trackId) {
        audioTrackIdRef.current = null;
        signedUrlRef.current = null;

        if (audio) {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
        }

        return;
      }

      // A new track always needs the host's signed URL. Track changes are
      // applied immediately; the 2-second threshold only covers drift while the
      // same track is playing.
      if (audioTrackIdRef.current !== payload.trackId) {
        if (!payload.signedUrl || !audio) {
          setNotice(WAITING_FOR_URL);
          return;
        }

        setNotice(null);
        setError(null);
        audioTrackIdRef.current = payload.trackId;
        signedUrlRef.current = payload.signedUrl;
        pendingSeekRef.current = target;
        playOnLoadRef.current = payload.state === "playing";
        audio.src = payload.signedUrl;
        audio.load();
        return;
      }

      if (!audio) return;

      if (audio.readyState >= 1) {
        const drift = checkDrift({
          localSeconds: audio.currentTime,
          remoteSeconds: target,
        });

        if (drift.shouldSeek) {
          try {
            audio.currentTime = drift.targetSeconds;
          } catch {
            // Ignore unsupported seeks; the next Broadcast retries.
          }
        }
      } else {
        pendingSeekRef.current = target;
      }

      if (payload.state === "playing") {
        if (audio.paused) {
          void startAudio();
        }
      } else if (!audio.paused) {
        audio.pause();
      }
    },
    [audioRef, startAudio],
  );

  // Keep the Broadcast handler fresh without re-subscribing on every render.
  const applyRemoteRef = useRef(applyRemote);

  useEffect(() => {
    applyRemoteRef.current = applyRemote;
  }, [applyRemote]);

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
        const initialPosition = estimateRoomPosition(mapped);

        isHostRef.current = host;
        setRoom(mapped);
        setIsPlaying(mapped.isPlaying);
        isPlayingRef.current = mapped.isPlaying;
        positionRef.current = initialPosition;
        setPosition(initialPosition);

        if (host && mapped.trackId) {
          await loadHostTrack(mapped.trackId, {
            position: initialPosition,
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
      .channel(`room:${roomId}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: ROOM_SYNC_EVENT }, (message) => {
        if (!isRoomSyncPayload(message.payload)) return;
        applyRemoteRef.current(message.payload);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("error");
        }
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadHostTrack, roomId]);

  // Host: announce the current state now and then every five seconds. This is
  // Broadcast-only; the database is never written from this interval.
  useEffect(() => {
    if (!isHost || realtimeStatus !== "connected") return;

    broadcastNow();
    const interval = window.setInterval(broadcastNow, ROOM_BROADCAST_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [broadcastNow, isHost, realtimeStatus]);

  // Mirror the audio element's time and metadata into React state.
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

      void (async () => {
        await persistHostState({ is_playing: false, position_seconds: 0 });
        broadcastNow();
      })();
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
  }, [audioRef, broadcastNow, persistHostState, startAudio]);

  const play = useCallback(async () => {
    if (!isHostRef.current || !currentTrackRef.current) return;

    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(true);
    isPlayingRef.current = true;

    const started = await startAudio();

    if (!started) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    await persistHostState({
      is_playing: true,
      position_seconds: Math.max(0, audio.currentTime),
    });
    broadcastNow();
  }, [audioRef, broadcastNow, persistHostState, startAudio]);

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
    broadcastNow();
  }, [audioRef, broadcastNow, persistHostState]);

  const togglePlay = useCallback(async () => {
    if (isPlayingRef.current) {
      await pause();
    } else {
      await play();
    }
  }, [pause, play]);

  const previewSeek = useCallback(
    (seconds: number) => {
      if (!isHostRef.current) return;

      const audio = audioRef.current;
      if (!audio) return;

      const target = seekTarget(audio, seconds);

      try {
        audio.currentTime = target;
      } catch {
        // Leave the element where it is when the source cannot seek.
      }

      positionRef.current = target;
      setPosition(target);
    },
    [audioRef],
  );

  const commitSeek = useCallback(
    async (seconds: number) => {
      if (!isHostRef.current) return;

      const audio = audioRef.current;
      if (!audio) return;

      const target = seekTarget(audio, seconds);

      try {
        audio.currentTime = target;
      } catch {
        // Leave the element where it is when the source cannot seek.
      }

      positionRef.current = target;
      setPosition(target);

      await persistHostState({ position_seconds: target });
      broadcastNow();
    },
    [audioRef, broadcastNow, persistHostState],
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
        audioTrackIdRef.current = next.id;
        positionRef.current = 0;
        isPlayingRef.current = true;

        setTrack(toRoomTrackSnapshot(next));
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

        broadcastNow();

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
    [audioRef, broadcastNow, persistHostState],
  );

  const retryPlayback = useCallback(async () => {
    await startAudio();
  }, [startAudio]);

  return {
    room,
    userId,
    isHost,
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
    selectTrack,
    play,
    pause,
    togglePlay,
    previewSeek,
    commitSeek,
    retryPlayback,
  };
}
