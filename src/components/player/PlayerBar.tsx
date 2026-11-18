"use client";

import { AddToPlaylistMenu } from "@/components/catalog/AddToPlaylistMenu";
import { usePlayerStore } from "@/stores/player";
import { formatTime } from "@/lib/utils";

import {
  MusicIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  VolumeIcon,
  VolumeOffIcon,
} from "../ui/icons";

function Cover({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="bg-surface-2 text-muted grid size-14 shrink-0 place-items-center rounded-control">
        <MusicIcon className="size-5" />
      </div>
    );
  }

  return (
    // Supabase cover URLs are arbitrary public URLs, so next/image is not used.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="bg-surface-2 size-14 shrink-0 rounded-control object-cover"
    />
  );
}

export function PlayerBar() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const position = usePlayerStore((state) => state.position);
  const duration = usePlayerStore((state) => state.duration);
  const volume = usePlayerStore((state) => state.volume);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const next = usePlayerStore((state) => state.next);
  const previous = usePlayerStore((state) => state.previous);
  const seek = usePlayerStore((state) => state.seek);
  const setVolume = usePlayerStore((state) => state.setVolume);

  const hasTrack = Boolean(currentTrack);
  const knownDuration = duration && duration > 0 ? duration : null;
  const progressMax = knownDuration ?? 1;
  const progressValue = Math.min(position, progressMax);
  const canSeek = hasTrack && Boolean(knownDuration);

  return (
    <div className="border-border/70 bg-surface/95 fixed inset-x-0 bottom-[6.5rem] z-40 border-t backdrop-blur-xl md:bottom-0">
      <div className="mx-auto grid h-20 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {/* Start: cover, title, artist, add to playlist. */}
        <div className="flex min-w-0 items-center gap-3">
          <Cover
            src={currentTrack?.coverUrl ?? null}
            alt={currentTrack ? `${currentTrack.title} — ${currentTrack.artist ?? ""}` : "لا يوجد غلاف"}
          />

          <div className="min-w-0">
            {currentTrack ? (
              <>
                <p className="truncate text-sm font-bold">{currentTrack.title}</p>
                <p className="text-muted truncate text-xs">
                  {currentTrack.artist ?? "مقطع مرفوع"}
                </p>
              </>
            ) : (
              <p className="text-muted truncate text-sm font-medium">اختر أغنية للبدء</p>
            )}
          </div>

          {currentTrack ? <AddToPlaylistMenu trackId={currentTrack.id} compact /> : null}
        </div>

        {/* Center: transport, then the progress bar with elapsed and total time. */}
        <div className="flex min-w-0 flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={previous}
              disabled={!hasTrack}
              aria-label="السابق"
              title="السابق"
              className="text-muted hover:text-foreground grid size-9 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PreviousIcon className="size-5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={!hasTrack}
              aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
              title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
              className="bg-accent text-accent-foreground hover:bg-accent-hover shadow-card grid size-12 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPlaying ? (
                <PauseIcon className="size-5" />
              ) : (
                <PlayIcon className="size-5 ps-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={next}
              disabled={!hasTrack}
              aria-label="التالي"
              title="التالي"
              className="text-muted hover:text-foreground grid size-9 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              <NextIcon className="size-5" />
            </button>
          </div>

          <div className="flex w-full items-center gap-2">
            <span className="text-muted hidden w-9 text-end text-[11px] tabular-nums md:block">
              {formatTime(position)}
            </span>

            <input
              type="range"
              min={0}
              max={progressMax}
              step={0.1}
              value={progressValue}
              onChange={(event) => seek(Number(event.target.value))}
              disabled={!canSeek}
              aria-label="موضع التشغيل"
              className="accent-accent h-1.5 w-full min-w-24 cursor-pointer disabled:cursor-not-allowed md:w-40 lg:w-56"
            />

            <span className="text-muted hidden w-9 text-[11px] tabular-nums md:block">
              {formatTime(knownDuration ?? 0)}
            </span>
          </div>
        </div>

        {/* End: mute toggle and volume slider. */}
        <div className="hidden items-center justify-end gap-1 md:flex">
          <button
            type="button"
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            disabled={!hasTrack}
            aria-label={volume > 0 ? "كتم الصوت" : "تشغيل الصوت"}
            title={volume > 0 ? "كتم الصوت" : "تشغيل الصوت"}
            className="text-muted hover:text-foreground grid size-9 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {volume > 0 ? <VolumeIcon className="size-4" /> : <VolumeOffIcon className="size-4" />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            disabled={!hasTrack}
            aria-label="مستوى الصوت"
            className="accent-accent hidden h-1.5 w-24 cursor-pointer disabled:cursor-not-allowed lg:block"
          />
        </div>
      </div>
    </div>
  );
}
