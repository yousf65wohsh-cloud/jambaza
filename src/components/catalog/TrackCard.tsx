import Link from "next/link";
import type { ReactNode } from "react";

import type { Track } from "@/types/track";

import { TrackCover } from "./TrackCover";

export function TrackCard({ track, meta }: { track: Track; meta?: ReactNode }) {
  return (
    <Link
      href={`/tracks?id=${track.id}`}
      className="card group hover:border-accent/50 overflow-hidden transition-colors"
    >
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
  );
}
