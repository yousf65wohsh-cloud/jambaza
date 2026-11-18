import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { PlayIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/track";

import { TrackCover } from "./TrackCover";

interface TrackCardProps {
  track: Track;
  meta?: ReactNode;
  /** Starts this track in the shared player, queued with the visible titles. */
  onPlay?: (track: Track) => void;
}

export function TrackCard({ track, meta, onPlay }: TrackCardProps) {
  return (
    <article className="card group hover:border-accent/60 hover:shadow-raised focus-within:border-accent/60 relative flex flex-col overflow-hidden transition-[translate,border-color,box-shadow] duration-200 hover:-translate-y-1 focus-within:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link href={`/tracks?id=${track.id}`} className="block flex-1">
        <div className="overflow-hidden">
          <TrackCover
            track={track}
            className="transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
          />
        </div>
        <div className={cn("space-y-1 p-3", onPlay && "pe-14")}>
          <h3
            dir="auto"
            className="group-hover:text-accent truncate text-sm font-bold transition-colors"
          >
            {track.title}
          </h3>
          <p dir="auto" className="text-muted truncate text-xs">
            {track.artist || "فنان غير معروف"}
          </p>
          {meta ? <div className="text-muted pt-1 text-xs">{meta}</div> : null}
        </div>
      </Link>

      {onPlay ? (
        <Button
          size="sm"
          aria-label={`تشغيل ${track.title}`}
          title={track.audioPath ? undefined : "لا يوجد ملف صوتي لهذه الأغنية."}
          disabled={!track.audioPath}
          onClick={() => onPlay(track)}
          className="shadow-glow absolute end-3 bottom-3 size-10! rounded-full! p-0!"
        >
          <PlayIcon className="size-4" />
        </Button>
      ) : null}
    </article>
  );
}
