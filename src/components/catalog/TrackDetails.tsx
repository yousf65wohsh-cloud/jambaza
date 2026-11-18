"use client";

import { TrackComments } from "@/components/catalog/TrackComments";
import { TrackCover } from "@/components/catalog/TrackCover";
import { TrackRatingSummary } from "@/components/catalog/TrackRatingSummary";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ChevronDownIcon, PlayIcon } from "@/components/ui/icons";
import { formatReleaseDate } from "@/lib/catalog/format";
import { useTrackDetails } from "@/lib/catalog/useTrackDetails";
import type { Track } from "@/types/track";

function DetailsSummary({
  children,
  count,
}: {
  children: string;
  count?: number;
}) {
  return (
    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-bold">
      <span className="flex items-center gap-2">
        {children}
        {count !== undefined ? (
          <span className="text-muted text-xs font-medium tabular-nums">{count}</span>
        ) : null}
      </span>
      <ChevronDownIcon className="text-muted size-4 shrink-0 transition-transform group-open:rotate-180" />
    </summary>
  );
}

/** The track details content shared by the desktop panel and the mobile sheet. */
export function TrackDetails({
  trackId,
  onPlay,
}: {
  trackId: string;
  onPlay: (track: Track) => void;
}) {
  const { loading, hasSession, track, ratings, comments, error, ratingsError, commentsError } =
    useTrackDetails(trackId);

  if (loading || hasSession === null) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (!hasSession) {
    return <p className="text-muted text-sm">سجّل الدخول لعرض تفاصيل الأغنية.</p>;
  }

  if (error) {
    return (
      <p role="alert" className="text-danger text-sm">
        {error}
      </p>
    );
  }

  if (!track) {
    return <p className="text-muted text-sm">الأغنية غير موجودة أو لم تعد منشورة.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="border-border bg-surface overflow-hidden rounded-panel border">
        <TrackCover track={track} />
      </div>

      <div className="space-y-1">
        <h2 dir="auto" className="text-xl font-extrabold tracking-tight">
          {track.title}
        </h2>
        <p dir="auto" className="text-muted text-sm">
          {track.artist || "فنان غير معروف"}
        </p>
        <p className="text-muted text-xs">صدر في {formatReleaseDate(track.releaseDate)}</p>
      </div>

      <TrackRatingSummary ratings={ratings} error={ratingsError} />

      <Button
        className="w-full gap-2"
        disabled={!track.audioPath}
        title={track.audioPath ? undefined : "لا يوجد ملف صوتي لهذه الأغنية."}
        onClick={() => onPlay(track)}
      >
        <PlayIcon className="size-4" />
        تشغيل
      </Button>

      <section className="space-y-1.5" aria-labelledby="details-description-heading">
        <h3 id="details-description-heading" className="text-sm font-bold">
          الوصف
        </h3>
        {track.description ? (
          <p dir="auto" className="text-muted text-sm leading-6 whitespace-pre-line">
            {track.description}
          </p>
        ) : (
          <p className="text-muted text-sm">لا يوجد وصف لهذه الأغنية.</p>
        )}
      </section>

      <details className="group border-border/70 rounded-control border">
        <DetailsSummary>الاعتمادات</DetailsSummary>
        <div className="px-3 pb-3">
          {track.credits ? (
            <p dir="auto" className="text-muted text-sm leading-6 whitespace-pre-line">
              {track.credits}
            </p>
          ) : (
            <p className="text-muted text-sm">لا توجد اعتمادات.</p>
          )}
        </div>
      </details>

      <details className="group border-border/70 rounded-control border">
        <DetailsSummary count={comments.length}>التعليقات</DetailsSummary>
        <div className="px-3 pb-3">
          <TrackComments comments={comments} error={commentsError} />
        </div>
      </details>
    </div>
  );
}
