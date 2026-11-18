import { MusicIcon } from "@/components/ui/icons";
import type { Track } from "@/types/track";

import { TrackDetails } from "./TrackDetails";

/** Persistent desktop details panel for the selected music row. */
export function TrackDetailsPanel({
  trackId,
  onPlay,
}: {
  trackId: string | null;
  onPlay: (track: Track) => void;
}) {
  return (
    <aside aria-label="تفاصيل الأغنية" className="hidden lg:block">
      <div className="border-border bg-surface/60 shadow-card sticky top-20 max-h-[calc(100dvh-11rem)] overflow-y-auto rounded-panel border p-4">
        {trackId ? (
          <div key={trackId} className="rise">
            <TrackDetails trackId={trackId} onPlay={onPlay} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-2 py-16 text-center">
            <MusicIcon className="text-muted size-8" aria-hidden="true" />
            <p className="text-sm font-bold">اختر مقطعاً لعرض التفاصيل</p>
            <p className="text-muted text-xs leading-5">
              اضغط على أي أغنية في القائمة لتظهر تفاصيلها هنا.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
