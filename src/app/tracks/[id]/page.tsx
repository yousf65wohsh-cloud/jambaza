import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToPlaylistMenu } from "@/components/catalog/AddToPlaylistMenu";
import { FeedbackForm } from "@/components/catalog/FeedbackForm";
import { SignInPrompt } from "@/components/catalog/SignInPrompt";
import { TrackCover } from "@/components/catalog/TrackCover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StarIcon } from "@/components/ui/icons";
import {
  getMyTrackRating,
  getTrack,
  hasCatalogSession,
  listTrackComments,
  listTrackRatings,
} from "@/lib/catalog/data";
import { formatFeedbackDate, formatRatingCount, formatReleaseDate } from "@/lib/catalog/format";
import { averageRating } from "@/lib/catalog/rating";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getTrack(id);

  if (!result.ok || !result.data) {
    return { title: "الأغنية غير موجودة" };
  }

  return { title: result.data.title };
}

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hasSession = await hasCatalogSession();

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

  const [trackResult, ratingsResult, commentsResult, myRatingResult] = await Promise.all([
    getTrack(id),
    listTrackRatings(id),
    listTrackComments(id),
    getMyTrackRating(id),
  ]);

  if (!trackResult.ok) {
    return (
      <main className="space-y-6">
        <Link href="/music" className="text-muted hover:text-foreground text-xs font-medium">
          ← العودة إلى الموسيقى
        </Link>
        <div className="border-danger/30 bg-danger/5 space-y-3 rounded-xl border p-4 text-sm">
          <p role="alert" className="text-danger">
            {trackResult.error.message}
          </p>
          <Link href={`/tracks/${id}`}>
            <Button variant="secondary" size="sm">
              إعادة المحاولة
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const track = trackResult.data;

  if (!track) {
    notFound();
  }

  const ratings = ratingsResult.ok ? ratingsResult.data : [];
  const average = averageRating(ratings.map((rating) => rating.rating));
  const ratingCount = ratings.length;
  const myRating = myRatingResult.ok ? myRatingResult.data : null;
  const comments = commentsResult.ok ? commentsResult.data : [];

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
            {!ratingsResult.ok ? (
              <p role="alert" className="text-danger text-sm">
                {ratingsResult.error.message}
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

      <FeedbackForm key={track.id} trackId={track.id} initialRating={myRating} />

      <section className="space-y-4" aria-labelledby="comments-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="comments-heading" className="text-xl font-extrabold tracking-tight">
            التعليقات
          </h2>
          <span className="text-muted text-sm">{formatCommentCount(comments.length)}</span>
        </div>

        {!commentsResult.ok ? (
          <p
            role="alert"
            className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-4 py-3 text-sm"
          >
            {commentsResult.error.message}
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
