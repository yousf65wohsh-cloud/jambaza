"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { AddToPlaylistMenu } from "@/components/catalog/AddToPlaylistMenu";
import { FeedbackForm } from "@/components/catalog/FeedbackForm";
import { SignInPrompt } from "@/components/catalog/SignInPrompt";
import { TrackCover } from "@/components/catalog/TrackCover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { MusicIcon, StarIcon } from "@/components/ui/icons";
import {
  getMyTrackRating,
  getTrack,
  hasCatalogSession,
  listTrackComments,
  listTrackRatings,
} from "@/lib/catalog/data";
import { formatFeedbackDate, formatRatingCount, formatReleaseDate } from "@/lib/catalog/format";
import { averageRating } from "@/lib/catalog/rating";
import type { Track, TrackComment } from "@/types/track";

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

function formatCommentCount(count: number): string {
  if (count === 0) {
    return "لا توجد تعليقات";
  }

  if (count === 1) {
    return "تعليق واحد";
  }

  return `${count} تعليقات`;
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

  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [track, setTrack] = useState<Track | null | undefined>(undefined);
  const [ratings, setRatings] = useState<number[]>([]);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [comments, setComments] = useState<TrackComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ratingsError, setRatingsError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!id) {
      setTrack(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setRatingsError(null);
    setCommentsError(null);

    const session = await hasCatalogSession();
    setHasSession(session);

    if (!session) {
      setLoading(false);
      return;
    }

    const [trackResult, ratingsResult, commentsResult, myRatingResult] = await Promise.all([
      getTrack(id),
      listTrackRatings(id),
      listTrackComments(id),
      getMyTrackRating(id),
    ]);

    if (!trackResult.ok) {
      setError(trackResult.error.message);
      setTrack(undefined);
      setLoading(false);
      return;
    }

    setTrack(trackResult.data);
    if (ratingsResult.ok) {
      setRatings(ratingsResult.data.map((r) => r.rating));
    } else {
      setRatingsError(ratingsResult.error.message);
      setRatings([]);
    }

    if (commentsResult.ok) {
      setComments(commentsResult.data);
    } else {
      setCommentsError(commentsResult.error.message);
      setComments([]);
    }

    if (myRatingResult.ok) {
      setMyRating(myRatingResult.data);
    } else {
      setMyRating(null);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

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
        <Link href="/music" className="text-muted hover:text-foreground text-xs font-medium">
          ← العودة إلى الموسيقى
        </Link>
        <SignInPrompt />
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-6">
        <Link href="/music" className="text-muted hover:text-foreground text-xs font-medium">
          ← العودة إلى الموسيقى
        </Link>
        <div className="border-danger/30 bg-danger/5 space-y-3 rounded-xl border p-4 text-sm">
          <p role="alert" className="text-danger">
            {error}
          </p>
          <Button variant="secondary" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            إعادة المحاولة
          </Button>
        </div>
      </main>
    );
  }

  if (!track) {
    return <TrackNotFound />;
  }

  const average = averageRating(ratings);
  const ratingCount = ratings.length;

  return (
    <main className="space-y-8">
      <Link
        href="/music"
        className="text-muted hover:text-foreground text-xs font-medium transition-colors"
      >
        ← العودة إلى الموسيقى
      </Link>

      <article className="grid gap-6 sm:grid-cols-[16rem_1fr] sm:items-start">
        <div className="border-border bg-surface overflow-hidden rounded-2xl border">
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
          </div>

          <div className="space-y-2">
            {ratingsError ? (
              <p role="alert" className="text-danger text-sm">
                {ratingsError}
              </p>
            ) : ratingCount > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <div
                  role="img"
                  aria-label={`متوسط التقييم ${average.toFixed(1)} من 5`}
                  className="flex items-center gap-0.5"
                >
                  {RATING_VALUES.map((value) => (
                    <StarIcon
                      key={value}
                      className={
                        value <= Math.round(average) ? "text-accent size-4" : "text-border size-4"
                      }
                    />
                  ))}
                </div>
                <span className="text-lg font-extrabold tabular-nums">{average.toFixed(1)}</span>
                <span className="text-muted text-sm">من 5 · {formatRatingCount(ratingCount)}</span>
              </div>
            ) : (
              <p className="text-muted text-sm">لا توجد تقييمات بعد — كن أول من يقيّم.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AddToPlaylistMenu trackId={track.id} />
          </div>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-2">
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

        <Card className="space-y-4">
          <h2 className="text-lg font-bold">تفاصيل الأغنية</h2>
          <dl className="space-y-3 text-sm">
            <div className="border-border/60 flex items-start justify-between gap-4 border-b pb-3">
              <dt className="text-muted shrink-0">تاريخ الإصدار</dt>
              <dd className="text-end">{formatReleaseDate(track.releaseDate)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted">الاعتمادات</dt>
              <dd dir="auto" className="leading-6 whitespace-pre-line">
                {track.credits || "غير متوفر"}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <FeedbackForm
        key={`${track.id}-${myRating ?? "none"}`}
        trackId={track.id}
        initialRating={myRating}
        onSuccess={() => setReloadKey((k) => k + 1)}
      />

      <section className="space-y-4" aria-labelledby="comments-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="comments-heading" className="text-xl font-extrabold tracking-tight">
            التعليقات
          </h2>
          <span className="text-muted text-sm">{formatCommentCount(comments.length)}</span>
        </div>

        {commentsError ? (
          <p
            role="alert"
            className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-4 py-3 text-sm"
          >
            {commentsError}
          </p>
        ) : comments.length > 0 ? (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li key={comment.id} className="card space-y-2 p-4">
                <p dir="auto" className="text-sm leading-7 whitespace-pre-line">
                  {comment.body}
                </p>
                <time dateTime={comment.createdAt} className="text-muted block text-xs">
                  {formatFeedbackDate(comment.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<StarIcon className="size-6" />}
            title="لا توجد تعليقات بعد"
            description="شارك رأيك في الأغنية من النموذج أعلاه لتظهر تعليقاتك هنا."
          />
        )}
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