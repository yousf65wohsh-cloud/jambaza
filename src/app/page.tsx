"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { TrackCard } from "@/components/catalog/TrackCard";
import { TrackCover } from "@/components/catalog/TrackCover";
import { SignInPrompt } from "@/components/catalog/SignInPrompt";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { MusicIcon, PlayIcon, StarIcon } from "@/components/ui/icons";
import { hasCatalogSession, listLatest, listTopRated } from "@/lib/catalog/data";
import { formatRatingCount } from "@/lib/catalog/format";
import { usePlayerStore } from "@/stores/player";
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

function LatestHero({ track, onPlay }: { track: Track; onPlay: (track: Track) => void }) {
  return (
    <section
      aria-labelledby="latest-hero-heading"
      className="card shadow-raised overflow-hidden"
    >
      <div className="grid sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <div className="overflow-hidden">
          <TrackCover track={track} />
        </div>

        <div className="flex flex-col justify-center gap-4 p-5 sm:p-7">
          <p className="text-accent text-xs font-bold tracking-wide">أحدث إصدار</p>

          <div className="space-y-1.5">
            <h2
              id="latest-hero-heading"
              dir="auto"
              className="text-2xl font-extrabold tracking-tight sm:text-3xl"
            >
              {track.title}
            </h2>
            <p dir="auto" className="text-muted text-base">
              {track.artist || "فنان غير معروف"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!track.audioPath}
              title={track.audioPath ? undefined : "لا يوجد ملف صوتي لهذه الأغنية."}
              onClick={() => onPlay(track)}
            >
              <PlayIcon className="size-4" />
              استمع الآن
            </Button>
            <Link href={`/tracks?id=${track.id}`}>
              <Button variant="secondary">التفاصيل</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Rail({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
      {children}
    </div>
  );
}

export default function HomePage() {
  const setTrack = usePlayerStore((state) => state.setTrack);

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

      {latest.length > 0 ? (
        <LatestHero track={latest[0]} onPlay={(selected) => setTrack(selected, latest)} />
      ) : null}

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
          <Rail>
            {latest.map((track) => (
              <div key={track.id} className="w-36 shrink-0 snap-start sm:w-44">
                <TrackCard
                  track={track}
                  onPlay={(selected) => setTrack(selected, latest)}
                />
              </div>
            ))}
          </Rail>
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
          <Rail>
            {topRated.map((track) => (
              <div key={track.id} className="w-36 shrink-0 snap-start sm:w-44">
                <TrackCard
                  track={track}
                  onPlay={(selected) => setTrack(selected, topRated)}
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
              </div>
            ))}
          </Rail>
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
