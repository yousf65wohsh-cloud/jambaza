"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AddToPlaylistMenu } from "@/components/catalog/AddToPlaylistMenu";
import { FeedbackForm } from "@/components/catalog/FeedbackForm";
import { SignInPrompt } from "@/components/catalog/SignInPrompt";
import { TrackComments } from "@/components/catalog/TrackComments";
import { TrackCover } from "@/components/catalog/TrackCover";
import { TrackRatingSummary } from "@/components/catalog/TrackRatingSummary";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { MusicIcon, PlayIcon } from "@/components/ui/icons";
import { formatCommentCount, formatReleaseDate } from "@/lib/catalog/format";
import { useTrackDetails } from "@/lib/catalog/useTrackDetails";
import { usePlayerStore } from "@/stores/player";

function BackLink() {
  return (
    <Link
      href="/music"
      className="text-muted hover:text-text text-xs font-medium transition-colors"
    >
      ← العودة إلى الموسيقى
    </Link>
  );
}

function TrackNotFound() {
  return (
    <main className="space-y-6">
      <EmptyState
        icon={<MusicIcon className="size-6" />}
        title="الأغنية غير موجودة"
        description="قد تكون الأغنية غير منشورة أو تم حذفها من الكتالوج."
        action={
          <Link href="/music">
            <Button variant="secondary" size="sm">
              العودة إلى الموسيقى
            </Button>
          </Link>
        }
      />
    </main>
  );
}

function TrackPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const setPlayerTrack = usePlayerStore((state) => state.setTrack);

  const {
    loading,
    hasSession,
    track,
    ratings,
    myRating,
    comments,
    error,
    ratingsError,
    commentsError,
    reload,
  } = useTrackDetails(id);

  if (loading || hasSession === null) {
    return (
      <main className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="space-y-6">
        <BackLink />
        <SignInPrompt />
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-6">
        <BackLink />
        <div className="border-danger/30 bg-danger/5 space-y-3 rounded-xl border p-4 text-sm">
          <p role="alert" className="text-danger">
            {error}
          </p>
          <Button variant="secondary" size="sm" onClick={reload}>
            إعادة المحاولة
          </Button>
        </div>
      </main>
    );
  }

  if (!track) {
    return <TrackNotFound />;
  }

  return (
    <main className="space-y-8">
      <BackLink />

      <article className="grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-start lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="border-border bg-surface shadow-raised rise overflow-hidden rounded-panel border">
          <TrackCover track={track} />
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-accent text-sm font-bold">أغنية منشورة</p>
            <h1 dir="auto" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {track.title}
            </h1>
            <p dir="auto" className="text-muted text-lg">
              {track.artist || "فنان غير معروف"}
            </p>
            <p className="text-muted text-xs">صدر في {formatReleaseDate(track.releaseDate)}</p>
          </div>

          {track.credits ? (
            <div className="space-y-1">
              <p className="text-muted text-xs font-bold">الاعتمادات</p>
              <p dir="auto" className="text-sm leading-6 whitespace-pre-line">
                {track.credits}
              </p>
            </div>
          ) : null}

          <TrackRatingSummary ratings={ratings} error={ratingsError} />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="gap-1.5"
              disabled={!track.audioPath}
              title={track.audioPath ? undefined : "لا يوجد ملف صوتي لهذه الأغنية."}
              onClick={() => setPlayerTrack(track, [track])}
            >
              <PlayIcon className="size-4" />
              تشغيل
            </Button>
            <AddToPlaylistMenu trackId={track.id} />
          </div>
        </div>
      </article>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">الوصف</h2>
        {track.description ? (
          <p dir="auto" className="text-muted text-sm leading-7 whitespace-pre-line">
            {track.description}
          </p>
        ) : (
          <p className="text-muted text-sm">لا يوجد وصف لهذه الأغنية.</p>
        )}
      </Card>

      <FeedbackForm
        key={`${track.id}-${myRating ?? "none"}`}
        trackId={track.id}
        initialRating={myRating}
        onSuccess={reload}
      />

      <section className="space-y-4" aria-labelledby="comments-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="comments-heading" className="text-xl font-extrabold tracking-tight">
            التعليقات
          </h2>
          <span className="text-muted text-sm">{formatCommentCount(comments.length)}</span>
        </div>

        <TrackComments
          comments={comments}
          error={commentsError}
          emptyDescription="شارك رأيك في الأغنية من النموذج أعلاه لتظهر تعليقاتك هنا."
        />
      </section>
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center py-20">
          <Spinner className="size-6" />
        </main>
      }
    >
      <TrackPageContent />
    </Suspense>
  );
}
