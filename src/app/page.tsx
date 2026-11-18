"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TrackCard } from "@/components/catalog/TrackCard";
import { SignInPrompt } from "@/components/catalog/SignInPrompt";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { MusicIcon, StarIcon } from "@/components/ui/icons";
import { hasCatalogSession, listLatest, listTopRated } from "@/lib/catalog/data";
import { formatRatingCount } from "@/lib/catalog/format";
import type { RatedTrack, Track } from "@/types/track";

function SectionError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-4 py-3 text-sm"
    >
      {message}
    </p>
  );
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [latest, setLatest] = useState<Track[]>([]);
  const [topRated, setTopRated] = useState<RatedTrack[]>([]);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [topRatedError, setTopRatedError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const session = await hasCatalogSession();
      if (!active) return;
      setHasSession(session);

      if (!session) {
        setLoading(false);
        return;
      }

      const [latestResult, topRatedResult] = await Promise.all([listLatest(10), listTopRated(5)]);
      if (!active) return;

      if (latestResult.ok) {
        setLatest(latestResult.data);
      } else {
        setLatestError(latestResult.error.message);
      }

      if (topRatedResult.ok) {
        setTopRated(topRatedResult.data);
      } else {
        setTopRatedError(topRatedResult.error.message);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="space-y-6">
        <PageHeader
          eyebrow="أهلاً بك في جمبزة"
          title="استمع مع أصدقائك"
          description="أحدث الأغاني المنشورة وأعلى التقييمات — كلها في مكان واحد."
        />
        <SignInPrompt />
      </main>
    );
  }

  return (
    <main className="space-y-10">
      <PageHeader
        eyebrow="أهلاً بك في جمبزة"
        title="استمع مع أصدقائك"
        description="أحدث الأغاني المنشورة وأعلى التقييمات — كلها في مكان واحد."
      />

      <section className="space-y-4" aria-labelledby="latest-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="latest-heading" className="text-xl font-extrabold tracking-tight">
            أحدث الإصدارات
          </h2>
          <Link
            href="/music"
            className="text-accent hover:text-accent-hover text-sm font-bold transition-colors"
          >
            عرض كل الموسيقى ←
          </Link>
        </div>

        {latestError ? (
          <SectionError message={latestError} />
        ) : latest.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {latest.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<MusicIcon className="size-6" />}
            title="لا توجد إصدارات منشورة بعد"
            description="ستظهر الأغاني هنا بمجرد نشرها في الكتالوج العام."
          />
        )}
      </section>

      <section className="space-y-4" aria-labelledby="top-rated-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="top-rated-heading" className="text-xl font-extrabold tracking-tight">
            الأعلى تقييماً
          </h2>
          <span className="text-muted text-sm">أفضل خمس أغاني حسب تقييمات المستمعين</span>
        </div>

        {topRatedError ? (
          <SectionError message={topRatedError} />
        ) : topRated.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {topRated.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                meta={
                  <span className="flex items-center gap-1.5">
                    <StarIcon className="text-accent size-3.5" />
                    <span className="text-foreground font-bold tabular-nums">
                      {track.averageRating.toFixed(1)}
                    </span>
                    <span>{formatRatingCount(track.ratingCount)}</span>
                  </span>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<StarIcon className="size-6" />}
            title="لا توجد تقييمات بعد"
            description="قيّم الأغاني المنشورة ليظهر أعلاها تقييماً هنا."
            action={
              <Link
                href="/music"
                className="text-accent hover:text-accent-hover text-sm font-bold transition-colors"
              >
                تصفّح الموسيقى ←
              </Link>
            }
          />
        )}
      </section>
    </main>
  );
}