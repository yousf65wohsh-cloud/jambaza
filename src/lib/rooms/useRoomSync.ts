"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { usePlayerStore } from "@/stores/player";
import {
  mapListeningRoomRow,
  type ListeningRoom,
} from "@/types/room";
import type { ListeningRoomRow } from "@/types/database";

export type RealtimeStatus = "connecting" | "connected" | "error";

export interface UseRoomSyncResult {
  room: ListeningRoom | null;
  userId: string | null;
  isHost: boolean;
  loading: boolean;
  error: string | null;
  realtimeStatus: RealtimeStatus;
  isSyncing: boolean;
  notice: string | null;
  syncNow: () => Promise<void>;
  loadRoomPlayback: () => void;
}

/**
 * Subscribes to Realtime changes on a single `listening_rooms` row.
 *
 * Write rules: only the host writes (enforced by RLS too). Members never
 * publish. Loading remote playback is a placeholder for now; the drift
 * correction it will use lives in `./drift`.
 */
export function useRoomSync(roomId: string): UseRoomSyncResult {
  const [room, setRoom] = useState<ListeningRoom | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const [isSyncing, setIsSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);

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
          setError("تعذّر تحميل غرفة الاستماع. حاول مرة أخرى.");
          setLoading(false);
          return;
        }

        if (!data) {
          setError("لم يتم العثور على الغرفة، أو أنك لست عضواً فيها.");
          setLoading(false);
          return;
        }

        setRoom(mapListeningRoomRow(data));
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
  }, [roomId]);

  const syncNow = useCallback(async () => {
    if (isSyncing) return;

    setNotice(null);
    setError(null);

    const state = usePlayerStore.getState();

    // Members: applying remote playback is a placeholder for now.
    if (userIdRef.current && room && room.hostId !== userIdRef.current) {
      setNotice("مزامنة التشغيل مع الغرفة غير متاحة بعد. ستُفعَّل في مرحلة لاحقة.");
      return;
    }

    // Hosts: publish the current playback state.
    if (!state.currentTrack) {
      setError("شغّل مقطعاً أولاً، ثم اضغط مزامنة.");
      return;
    }

    setIsSyncing(true);
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("listening_rooms")
        .update({
          is_playing: state.isPlaying,
          position_seconds: Math.max(0, state.position),
        })
        .eq("id", roomId)
        .select("*")
        .single();

      if (updateError) {
        setError("تعذّرت مزامنة الغرفة. تأكد من أنك المضيف وحاول مجدداً.");
        return;
      }

      setRoom(mapListeningRoomRow(data));
      setNotice("تمت مزامنة حالة التشغيل مع الأعضاء.");
    } catch {
      setError("تعذّرت مزامنة الغرفة. تحقق من اتصالك بالإنترنت.");
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, room, roomId]);

  const loadRoomPlayback = useCallback(() => {
    if (!room) return;
    setNotice("تحميل مقطع الغرفة في المشغل غير متاح بعد. سيُفعَّل في مرحلة لاحقة.");
  }, [room]);

  return {
    room,
    userId,
    isHost: Boolean(userId && room && room.hostId === userId),
    loading,
    error,
    realtimeStatus,
    isSyncing,
    notice,
    syncNow,
    loadRoomPlayback,
  };
}
