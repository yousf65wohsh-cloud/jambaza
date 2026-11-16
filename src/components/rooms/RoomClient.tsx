"use client";

import { useEffect, useRef } from "react";

import { usePlayerStore } from "@/stores/player";
import { PageHeader } from "@/components/layout/PageHeader";
import { HeadphonesIcon, MusicIcon, PauseIcon, PlayIcon } from "@/components/ui/icons";
import { useRoomSync } from "@/lib/rooms/useRoomSync";
import { cn, formatTime } from "@/lib/utils";

import { RoomTrackPicker } from "./RoomTrackPicker";

function StatusPill({ tone, children }: { tone: "success" | "danger" | "muted"; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "danger" && "border-danger/30 bg-danger/10 text-danger",
        tone === "muted" && "border-border bg-surface-2 text-muted",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "success" && "bg-success",
          tone === "danger" && "bg-danger",
          tone === "muted" && "bg-muted",
        )}
      />
      {children}
    </span>
  );
}

export function RoomClient({ roomId }: { roomId: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    room,
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
    togglePlay,
    previewSeek,
    commitSeek,
    retryPlayback,
  } = useRoomSync(roomId, audioRef);

  // Room playback is separate from the global player. Stop the global queue so
  // the two audio elements never play over each other.
  useEffect(() => {
    usePlayerStore.getState().pause();
  }, []);

  const knownDuration =
    duration && duration > 0 ? duration : (track?.durationSeconds ?? null);
  const progressMax = knownDuration ?? 1;
  const progressValue = Math.min(position, progressMax);
  const waitingForHost = Boolean(room && !isHost && !track);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="غرفة استماع"
        title="استمعوا معاً"
        description="المضيف يتحكم بالمقطع، والأعضاء يستقبلون المزامنة تلقائياً."
      />

      <div className="card overflow-hidden">
        <audio ref={audioRef} preload="metadata" className="hidden" />

        <div className="from-surface-2 via-surface relative overflow-hidden bg-gradient-to-br to-black p-5 sm:p-7">
          <div className="bg-accent/10 absolute -top-16 -end-16 size-64 rounded-full blur-3xl" />

          <div className="relative flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-4">
              {track?.coverUrl ? (
                // Supabase cover URLs are public URLs; next/image is not used.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.coverUrl}
                  alt={`غلاف ${track.title}`}
                  className="bg-surface-2 size-20 shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <span className="bg-accent/10 text-accent grid size-20 shrink-0 place-items-center rounded-2xl">
                  <MusicIcon className="size-8" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                {loading ? (
                  <p className="text-muted text-sm">جارٍ تحميل الغرفة...</p>
                ) : room ? (
                  <>
                    <p className="truncate text-lg font-bold">
                      {track?.title ??
                        (waitingForHost ? "بانتظار اختيار المضيف…" : "لم يُختر مقطع بعد")}
                    </p>
                    <p className="text-muted truncate text-sm">
                      {track?.artist ??
                        (waitingForHost
                          ? "سيصل المقطع من المضيف تلقائياً."
                          : "اختر مقطعاً من مكتبتك أو قائمة تشغيل.")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold">الغرفة غير متاحة</p>
                    <p className="text-muted max-w-md text-sm leading-6">
                      {error ?? "لم يتم العثور على الغرفة، أو أنك لست عضواً فيها."}
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {room ? (
                  <StatusPill tone={isPlaying ? "success" : "muted"}>
                    {isPlaying ? "قيد التشغيل" : "متوقف"}
                  </StatusPill>
                ) : null}
                {room ? (
                  <StatusPill tone={isHost ? "success" : "muted"}>
                    {isHost ? "أنت المضيف" : "عضو"}
                  </StatusPill>
                ) : null}
                <StatusPill tone={realtimeStatus === "connected" ? "success" : "muted"}>
                  {realtimeStatus === "connected"
                    ? "متصل بالغرفة"
                    : realtimeStatus === "error"
                      ? "تعذّر الاتصال"
                      : "جارٍ الاتصال..."}
                </StatusPill>
              </div>
            </div>

            {room ? (
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={progressMax}
                  step={0.1}
                  value={progressValue}
                  onChange={(event) => previewSeek(Number(event.target.value))}
                  onPointerUp={(event) =>
                    void commitSeek(Number(event.currentTarget.value))
                  }
                  onPointerCancel={(event) =>
                    void commitSeek(Number(event.currentTarget.value))
                  }
                  onKeyUp={(event) => void commitSeek(Number(event.currentTarget.value))}
                  disabled={!isHost || !track || !knownDuration}
                  aria-label="موضع تشغيل الغرفة"
                  className="accent-accent h-1.5 w-full cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="text-muted flex items-center justify-between text-[11px] tabular-nums">
                  <span>{formatTime(position)}</span>
                  <span>{knownDuration ? formatTime(knownDuration) : "--:--"}</span>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              {isHost && room ? (
                <>
                  <button
                    type="button"
                    onClick={() => void togglePlay()}
                    disabled={!track || isSyncing}
                    aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                    title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                    className="bg-accent text-accent-foreground hover:bg-accent-hover grid size-12 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPlaying ? (
                      <PauseIcon className="size-5" />
                    ) : (
                      <PlayIcon className="size-5 ps-0.5" />
                    )}
                  </button>

                  <span className="text-muted text-xs">
                    أنت تتحكم بالتشغيل. تُكتب الحالة في قاعدة البيانات عند التشغيل أو
                    الإيقاف أو التقديم فقط.
                  </span>
                </>
              ) : null}

              {room && !isHost ? (
                <p className="text-muted text-xs leading-5">
                  {needsGesture
                    ? "المتصفح منع التشغيل التلقائي. اضغط لتمكين الصوت."
                    : waitingForHost
                      ? "سيبدأ التشغيل عند اختيار المضيف للمقطع."
                      : "الأعضاء يستقبلون حالة التشغيل من المضيف فقط."}
                </p>
              ) : null}

              {needsGesture ? (
                <button
                  type="button"
                  onClick={() => void retryPlayback()}
                  className="border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                >
                  تمكين الصوت
                </button>
              ) : null}

              <StatusPill tone={realtimeStatus === "connected" ? "success" : "muted"}>
                {realtimeStatus === "connected" ? "المزامنة جاهزة" : "جارٍ المزامنة..."}
              </StatusPill>
            </div>

            {isHost && room ? (
              <RoomTrackPicker
                currentTrackId={room.trackId}
                ownerId={room.hostId}
                disabled={loading || isSyncing}
                onSelect={(next) => void selectTrack(next)}
              />
            ) : null}

            {notice ? (
              <p role="status" className="text-success text-xs">
                {notice}
              </p>
            ) : null}

            {error ? (
              <p role="alert" className="text-danger text-xs">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <p className="text-muted text-[11px] leading-5">
            يُصحّح موضع الأعضاء فقط عند تجاوز الفارق ثانيتين. روابط الصوت موقّعة وقصيرة
            الأجل من مخزن الصوت الخاص.
          </p>

          <dl className="border-border/70 grid gap-2 border-t pt-3 text-xs sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <dt className="text-muted">معرّف الغرفة</dt>
              <dd dir="ltr" className="font-mono">
                {roomId}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <dt className="text-muted">المضيف</dt>
              <dd dir="ltr" className="font-mono">
                {room ? (isHost ? "أنت" : `${room.hostId.slice(0, 8)}…`) : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <p className="text-muted flex items-center justify-center gap-2 text-center text-[11px] leading-6">
        <HeadphonesIcon className="size-4" />
        غرفة الاستماع خاصة بأعضائها؛ يشارك المضيف المقطع وحالة التشغيل فقط.
      </p>
    </main>
  );
}
