import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { PlayIcon } from "@/components/ui/icons";
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
    <article className="card group hover:border-accent/50 flex flex-col overflow-hidden transition-colors">
      <Link href={`/tracks?id=${track.id}`} className="block flex-1">
        <div className="overflow-hidden">
          <TrackCover
            track={track}
            className="transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <div className="space-y-1 p-3">
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
        <div className="px-3 pb-3">
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={!track.audioPath}
            title={track.audioPath ? undefined : "لا يوجد ملف صوتي لهذه الأغنية."}
            aria-label={`تشغيل ${track.title}`}
            onClick={() => onPlay(track)}
          >
            <PlayIcon className="size-4" />
            تشغيل
          </Button>
        </div>
      ) : null}
    </article>
  );
}
