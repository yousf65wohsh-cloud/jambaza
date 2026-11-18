"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { TrackCover } from "@/components/catalog/TrackCover";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  HeadphonesIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  VolumeIcon,
  VolumeOffIcon,
} from "@/components/ui/icons";
import { endRoom } from "@/lib/rooms/data";
import {
  listeningPlaybackLabel,
  listeningPopupTitle,
  listeningRoleLabel,
} from "@/lib/rooms/popup";
import { useRoomSync } from "@/lib/rooms/useRoomSync";
import { cn } from "@/lib/utils";
import { useListeningSessionStore } from "@/stores/listeningSession";
import { usePlayerStore } from "@/stores/player";

import { RoomTrackPicker } from "./RoomTrackPicker";

/**
 * Floating shared-listening window. Mounted once in the app shell so it
 * survives client-side navigation; the friends page opens it by room id.
 */
export function ListeningPopup() {
  const roomId = useListeningSessionStore((state) => state.roomId);
  const peerName = useListeningSessionStore((state) => state.peerName);
  const pathname = usePathname();

  if (!roomId) return null;

  // The standalone room page owns playback there; rendering both would play the
  // same audio twice.
  if (pathname === "/rooms" || pathname.startsWith("/rooms/")) return null;

  return <ListeningPopupWindow key={roomId} roomId={roomId} peerName={peerName} />;
}

function ListeningPopupWindow({
  roomId,
  peerName,
}: {
  roomId: string;
  peerName: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const close = useListeningSessionStore((state) => state.close);
  const volume = usePlayerStore((state) => state.volume);
  const setVolume = usePlayerStore((state) => state.setVolume);

  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  const {
    room,
    isHost,
    loading,
    error,
    isSyncing,
    notice,
    track,
    isPlaying,
    needsGesture,
    togglePlay,
    pause: pauseRoom,
    selectTrack,
    retryPlayback,
  } = useRoomSync(roomId, audioRef);

  // Room playback is separate from the global player. Stop the global queue so
  // the two audio elements never play over each other.
  useEffect(() => {
    usePlayerStore.getState().pause();
  }, []);

  // Volume is a per-listener preference: it only touches this browser's audio
  // element. It is never persisted or broadcast.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  async function handleEnd() {
    if (ending) return;

    setEnding(true);
    setEndError(null);

    // Pause first so members stop before the room row disappears.
    if (isPlaying) {
      await pauseRoom();
    }

    const result = await endRoom(roomId);

    setEnding(false);

    if (!result.ok) {
      setEndError(result.error.message);
      return;
    }

    close();
  }

  return (
    <>
      <audio ref={audioRef} preload="metadata" className="hidden" />

      <section
        role="dialog"
        aria-label="نافذة الاستماع المشترك"
        dir="rtl"
        className="border-border/80 bg-surface/95 fixed bottom-40 left-4 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl md:bottom-24"
      >
        <header className="border-border/70 bg-surface-2/60 flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <HeadphonesIcon className="text-accent size-4 shrink-0" />
            <span className="truncate text-xs font-bold">استماع مشترك</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                isHost
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border bg-surface-2 text-muted",
              )}
            >
              {listeningRoleLabel(isHost, peerName)}
            </span>

            <button
              type="button"
              onClick={close}
              aria-label="إغلاق نافذة الاستماع"
              title="إغلاق"
              className="text-muted hover:text-foreground hover:bg-surface-2 grid size-7 place-items-center rounded-full text-lg leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </header>

        <div className="max-h-[70dvh] space-y-3 overflow-y-auto overscroll-contain p-3">
          <p dir="auto" className="truncate text-sm font-bold">
            {listeningPopupTitle(peerName)}
          </p>

          {loading ? (
            <p className="text-muted flex items-center gap-2 text-xs">
              <Spinner />
              جارٍ تحميل الجلسة…
            </p>
          ) : error && !room ? (
            <p role="alert" className="text-danger text-xs">
              {error}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="block w-12 shrink-0 overflow-hidden rounded-lg">
                  {track ? (
                    <TrackCover track={track} />
                  ) : (
                    <span className="bg-surface-2 text-muted grid aspect-square w-full place-items-center">
                      <MusicIcon className="size-5" />
                    </span>
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p dir="auto" className="truncate text-sm font-bold">
                    {track?.title ?? "لم يُختر مقطع بعد"}
                  </p>
                  <p dir="auto" className="text-muted truncate text-xs">
                    {track?.artist ??
                      (isHost ? "اختر مقطعاً للبدء." : "بانتظار اختيار المضيف…")}
                  </p>
                </div>

                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    isPlaying
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-border bg-surface-2 text-muted",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isPlaying ? "bg-success" : "bg-muted",
                    )}
                  />
                  {listeningPlaybackLabel(isPlaying)}
                </span>
              </div>

              {isHost ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void togglePlay()}
                      disabled={!track || isSyncing}
                      aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                      title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                      className="bg-accent text-accent-foreground hover:bg-accent-hover grid size-9 shrink-0 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPlaying ? (
                        <PauseIcon className="size-4" />
                      ) : (
                        <PlayIcon className="size-4 ps-0.5" />
                      )}
                    </button>

                    <p className="text-muted text-[11px] leading-4">
                      أنت تتحكم بالتشغيل والمقطع.
                    </p>
                  </div>

                  {room ? (
                    <RoomTrackPicker
                      currentTrackId={room.trackId}
                      ownerId={room.hostId}
                      disabled={loading || isSyncing}
                      onSelect={(next) => void selectTrack(next)}
                    />
                  ) : null}
                </div>
              ) : (
                <p className="text-muted text-[11px] leading-4">
                  التشغيل والمقطع يتحكم بهما المضيف.
                </p>
              )}

              <div className="border-border/70 flex items-center gap-2 border-t pt-2">
                <button
                  type="button"
                  onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                  aria-label={volume > 0 ? "كتم الصوت" : "تشغيل الصوت"}
                  title="مستوى الصوت لديك فقط"
                  className="text-muted hover:text-foreground grid size-7 shrink-0 place-items-center rounded-full transition-colors"
                >
                  {volume > 0 ? (
                    <VolumeIcon className="size-4" />
                  ) : (
                    <VolumeOffIcon className="size-4" />
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  aria-label="مستوى الصوت المحلي"
                  className="accent-accent h-1.5 flex-1 cursor-pointer"
                />

                <span className="text-muted w-8 text-end text-[10px] tabular-nums">
                  {Math.round(volume * 100)}%
                </span>
              </div>

              {needsGesture ? (
                <button
                  type="button"
                  onClick={() => void retryPlayback()}
                  className="border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 w-full rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors"
                >
                  تمكين الصوت
                </button>
              ) : null}

              {notice ? (
                <p role="status" className="text-success text-[11px] leading-4">
                  {notice}
                </p>
              ) : null}

              {error ? (
                <p role="alert" className="text-danger text-[11px] leading-4">
                  {error}
                </p>
              ) : null}

              {endError ? (
                <p role="alert" className="text-danger text-[11px] leading-4">
                  {endError}
                </p>
              ) : null}

              {isHost ? (
                confirmEnd ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      className="flex-1"
                      loading={ending}
                      onClick={() => void handleEnd()}
                    >
                      تأكيد الإنهاء
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      disabled={ending}
                      onClick={() => setConfirmEnd(false)}
                    >
                      إلغاء
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    className="w-full"
                    onClick={() => setConfirmEnd(true)}
                  >
                    إنهاء الجلسة
                  </Button>
                )
              ) : null}
            </>
          )}
        </div>
      </section>
    </>
  );
}
