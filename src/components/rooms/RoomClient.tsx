"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { HeadphonesIcon, RefreshIcon, VideoIcon } from "@/components/ui/icons";
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
  const {
    room,
    isHost,
    loading,
    error,
    realtimeStatus,
    isSyncing,
    notice,
    syncNow,
    loadRoomPlayback,
    selectTrack,
  } = useRoomSync(roomId);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="غرفة استماع"
        title="استمعوا معاً"
        description="المضيف يتحكم بالمقطع، والأعضاء يستقبلون المزامنة تلقائياً."
      />

      <div className="card overflow-hidden">
        <div className="from-surface-2 via-surface relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br to-black">
          <div className="bg-accent/10 absolute -top-16 -end-16 size-64 rounded-full blur-3xl" />
          <div className="relative flex flex-col items-center gap-3 px-6 text-center">
            <div className="bg-accent/10 text-accent grid size-16 place-items-center rounded-2xl">
              <VideoIcon className="size-8" />
            </div>

            {loading ? (
              <p className="text-muted text-sm">جارٍ تحميل الغرفة...</p>
            ) : room ? (
              <>
                <p className="text-lg font-bold">منطقة تشغيل الغرفة</p>
                <p className="text-muted text-[11px]">
                  {room.isPlaying ? "الغرفة قيد التشغيل" : "الغرفة متوقفة"} — الموضع{" "}
                  <span className="tabular-nums">{formatTime(room.positionSeconds)}</span>
                </p>
                <p dir="ltr" className="text-muted font-mono text-[10px]">
                  {room.trackId ? `track: ${room.trackId.slice(0, 8)}…` : "no track selected"}
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

          <p className="text-muted absolute inset-x-4 bottom-3 text-center text-[10px] leading-5">
            سيُعرض مشغل الغرفة هنا في مرحلة لاحقة.
          </p>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {room ? (
              <>
                <StatusPill tone={room.isPlaying ? "success" : "muted"}>
                  {room.isPlaying ? "قيد التشغيل" : "متوقف"}
                </StatusPill>
                <StatusPill tone={isHost ? "success" : "muted"}>
                  {isHost ? "أنت المضيف" : "عضو"}
                </StatusPill>
              </>
            ) : null}

            <StatusPill tone={realtimeStatus === "connected" ? "success" : "muted"}>
              {realtimeStatus === "connected"
                ? "متصل بالغرفة"
                : realtimeStatus === "error"
                  ? "تعذّر الاتصال"
                  : "جارٍ الاتصال..."}
            </StatusPill>

            <span className="text-muted ms-auto text-[11px]">
              يُصحّح الفارق فقط عند تجاوزه ثانيتين.
            </span>
          </div>

          {isHost && room ? (
            <RoomTrackPicker
              currentTrackId={room.trackId}
              disabled={loading || isSyncing}
              onSelect={(track) => void selectTrack(track.id)}
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={loadRoomPlayback}
              disabled={!room || loading}
              className="gap-2"
            >
              <HeadphonesIcon className="size-4" />
              تحميل مقطع الغرفة
            </Button>

            <Button
              onClick={() => void syncNow()}
              loading={isSyncing}
              disabled={!room || loading}
              className="gap-2"
            >
              <RefreshIcon className="size-4" />
              {isHost ? "مزامنة الغرفة" : "مزامنة مع الغرفة"}
            </Button>

            <Button variant="secondary" disabled title="قريباً">
              إنشاء غرفة (قريباً)
            </Button>
          </div>

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

      <p className="text-muted text-center text-[11px] leading-6">
        إدارة الغرف والأعضاء ستُضاف في المرحلة التالية. حالياً تُدار العضوية من قاعدة البيانات.
      </p>
    </main>
  );
}
