"use client";

import { TrackCover } from "@/components/catalog/TrackCover";
import { Button } from "@/components/ui/Button";
import { PlayIcon } from "@/components/ui/icons";
import { formatDuration } from "@/lib/catalog/format";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/track";

interface TrackRowProps {
  track: Track;
  selected?: boolean;
  onSelect: (track: Track) => void;
  onPlay: (track: Track) => void;
}

/** One compact catalog row: cover, title, artist, duration, and play action. */
export function TrackRow({ track, selected = false, onSelect, onPlay }: TrackRowProps) {
  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-control px-2 py-2 transition-colors",
        selected ? "bg-surface-2" : "hover:bg-surface-2/50 focus-within:bg-surface-2/50",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(track)}
        aria-current={selected ? "true" : undefined}
        className="focus-visible:ring-accent/60 flex min-w-0 flex-1 items-center gap-3 rounded-control text-start outline-none focus-visible:ring-2"
      >
        <span className="bg-surface-2 block size-12 shrink-0 overflow-hidden rounded-lg">
          <TrackCover track={track} />
        </span>

        <span className="min-w-0 flex-1">
          <span dir="auto" className="block truncate text-sm font-bold">
            {track.title}
          </span>
          <span dir="auto" className="text-muted block truncate text-xs">
            {track.artist || "فنان غير معروف"}
          </span>
        </span>
      </button>

      <span className="text-muted w-10 shrink-0 text-end text-xs tabular-nums">
        {formatDuration(track.durationSeconds)}
      </span>

      <Button
        size="sm"
        variant="ghost"
        aria-label={`تشغيل ${track.title}`}
        title={track.audioPath ? undefined : "لا يوجد ملف صوتي لهذه الأغنية."}
        disabled={!track.audioPath}
        onClick={() => onPlay(track)}
        className="size-9 shrink-0 rounded-full p-0"
      >
        <PlayIcon className="size-4" />
      </Button>
    </li>
  );
}
