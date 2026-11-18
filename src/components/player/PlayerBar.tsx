"use client";

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
      <div className="bg-surface-2 text-muted grid size-12 shrink-0 place-items-center rounded-lg">
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
      className="bg-surface-2 size-12 shrink-0 rounded-lg object-cover"
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

  return (
    <div className="border-border/70 bg-surface/95 fixed inset-x-0 bottom-[6.5rem] z-40 border-t backdrop-blur-xl md:bottom-0">
      <div className="mx-auto flex h-20 max-w-6xl items-center gap-3 px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Cover
            src={currentTrack?.coverUrl ?? null}
            alt={currentTrack ? `${currentTrack.title} — ${currentTrack.artist ?? ""}` : "لا يوجد غلاف"}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {currentTrack?.title ?? "لا يوجد تشغيل"}
            </p>
            <p className="text-muted truncate text-xs">
              {currentTrack
                ? (currentTrack.artist ?? "مقطع مرفوع")
                : "اختر أغنية للبدء"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={previous}
            disabled={!hasTrack}
            aria-label="السابق"
            title="السابق"
            className="text-muted hover:text-foreground grid size-10 place-items-center rounded-full transition-colors disabled:opacity-40"
          >
            <PreviousIcon className="size-5" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={!hasTrack}
            aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
            title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
            className="bg-accent text-accent-foreground hover:bg-accent-hover grid size-11 place-items-center rounded-full transition-colors disabled:opacity-40"
          >
            {isPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5 ps-0.5" />}
          </button>

          <button
            type="button"
            onClick={next}
            disabled={!hasTrack}
            aria-label="التالي"
            title="التالي"
            className="text-muted hover:text-foreground grid size-10 place-items-center rounded-full transition-colors disabled:opacity-40"
          >
            <NextIcon className="size-5" />
          </button>
        </div>

        <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
          <span className="text-muted w-9 text-end text-[11px] tabular-nums">
            {formatTime(position)}
          </span>
          <input
            type="range"
            min={0}
            max={progressMax}
            step={0.1}
            value={progressValue}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={!hasTrack || !knownDuration}
            aria-label="موضع التشغيل"
            className="accent-accent h-1.5 w-28 max-w-48 flex-1 cursor-pointer disabled:cursor-not-allowed lg:w-40"
          />
          <span className="text-muted w-9 text-[11px] tabular-nums">
            {formatTime(knownDuration ?? 0)}
          </span>

          <div className="ms-2 hidden items-center gap-1 lg:flex">
            <button
              type="button"
              onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
              aria-label={volume > 0 ? "كتم الصوت" : "تشغيل الصوت"}
              title={volume > 0 ? "كتم الصوت" : "تشغيل الصوت"}
              className="text-muted hover:text-foreground grid size-9 place-items-center rounded-full transition-colors"
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
              aria-label="مستوى الصوت"
              className="accent-accent h-1.5 w-20 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Compact progress bar on mobile. */}
      <input
        type="range"
        min={0}
        max={progressMax}
        step={0.1}
        value={progressValue}
        onChange={(event) => seek(Number(event.target.value))}
        disabled={!hasTrack || !knownDuration}
        aria-label="موضع التشغيل"
        className="accent-accent absolute inset-x-0 top-0 h-1 w-full cursor-pointer bg-transparent disabled:cursor-not-allowed md:hidden"
      />
    </div>
  );
}
