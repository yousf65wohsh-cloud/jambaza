"use client";

import { useEffect } from "react";

import { CloseIcon } from "@/components/ui/icons";
import type { Track } from "@/types/track";

import { TrackDetails } from "./TrackDetails";

/** Mobile bottom sheet that mirrors the desktop details panel. */
export function TrackDetailsSheet({
  trackId,
  onClose,
  onPlay,
}: {
  trackId: string;
  onClose: () => void;
  onPlay: (track: Track) => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        aria-label="إغلاق التفاصيل"
        onClick={onClose}
        className="bg-background/70 absolute inset-0 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="تفاصيل الأغنية"
        className="border-border bg-surface shadow-raised absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-panel border-t p-4 pb-8"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold tracking-tight">تفاصيل الأغنية</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="text-muted hover:text-text hover:bg-surface-2 grid size-9 place-items-center rounded-full transition-colors"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <TrackDetails trackId={trackId} onPlay={onPlay} />
      </div>
    </div>
  );
}
