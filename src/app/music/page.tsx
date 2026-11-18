"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CategoryChips, type MusicCategory } from "@/components/catalog/CategoryChips";
import { TrackCard } from "@/components/catalog/TrackCard";
import { SignInPrompt } from "@/components/catalog/SignInPrompt";
import { MusicSearch } from "@/components/search/MusicSearch";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { MusicIcon, NextIcon, PreviousIcon, SearchIcon } from "@/components/ui/icons";
import { hasCatalogSession, listAll, searchTracks } from "@/lib/catalog/data";
import { usePlayerStore } from "@/stores/player";
import type { Track } from "@/types/track";

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * The catalog currently holds music only, so the "موسيقى" chip keeps every
 * loaded row. The filter stays client-side and is ready for more categories.
 */
function filterByCategory(tracks: Track[], category: MusicCategory): Track[] {
  if (category === "all") {
    return tracks;
  }

  return tracks.filter((track) => track.sourceType === "upload" || track.sourceType === "youtube");
}

function MusicHeader() {
  return (
    <header className="space-y-2">
      <p className="text-accent text-sm font-bold">الكتالوج</p>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">الموسيقى</h1>
      <p className="text-muted max-w-2xl text-sm leading-6">
        كل الأغاني المنشورة في الكتالوج. اختر أغنية لعرض تفاصيلها وتقييمها والتعليق عليها.
      </p>
    </header>
  );
}

function MusicPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = useMemo(() => parsePage(searchParams.get("page")), [searchParams]);
  const setTrack = usePlayerStore((state) => state.setTrack);

  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<string | null>(null);
  const [category, setCategory] = useState<MusicCategory>("all");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const session = await hasCatalogSession();
      if (!active) return;
      setHasSession(session);

      if (!session) {
        setLoading(false);
        return;
      }

      const result = await listAll(page);
      if (!active) return;

      if (!result.ok) {
        setError(result.error.message);
        setTracks([]);
        setTotal(0);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const totalPages = Math.max(1, Math.ceil(result.data.total / result.data.pageSize));
      if (result.data.total > 0 && page > totalPages) {
        router.replace(`/music?page=${totalPages}`);
        return;
      }

      setTracks(result.data.tracks);
      setTotal(result.data.total);
      setHasMore(result.data.hasMore);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [page, router]);

  useEffect(() => {
    if (query === null) {
      return;
    }

    const activeQuery = query;
    let active = true;

    async function search() {
      setSearching(true);
      setSearchError(null);

      const result = await searchTracks(activeQuery);
      if (!active) return;

      if (result.ok) {
        setSearchResults(result.data);
      } else {
        setSearchResults([]);
        setSearchError(result.error.message);
      }

      setSearching(false);
    }

    void search();

    return () => {
      active = false;
    };
  }, [query]);

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
        <MusicHeader />
        <SignInPrompt />
      </main>
    );
  }

  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const sourceTracks = query !== null ? searchResults : tracks;
  const visibleTracks = filterByCategory(sourceTracks, category);

  return (
    <main className="space-y-6">
      <MusicHeader />

      <div className="space-y-3">
        <MusicSearch onQueryChange={setQuery} />
        <CategoryChips value={category} onChange={setCategory} />
      </div>

      {query !== null ? (
        searching ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : searchError ? (
          <div className="border-danger/30 bg-danger/5 space-y-3 rounded-xl border p-4 text-sm">
            <p role="alert" className="text-danger">
              {searchError}
            </p>
          </div>
        ) : visibleTracks.length === 0 ? (
          <EmptyState
            icon={<SearchIcon className="size-6" />}
            title="لا توجد نتائج مطابقة"
            description={`لم نعثر على أغانٍ تطابق «${query}». جرّب كلمات أخرى.`}
          />
        ) : (
          <>
            <p className="text-muted text-sm">{visibleTracks.length} نتيجة</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibleTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onPlay={(selected) => setTrack(selected, visibleTracks)}
                />
              ))}
            </div>
          </>
        )
      ) : error ? (
        <div className="border-danger/30 bg-danger/5 space-y-3 rounded-xl border p-4 text-sm">
          <p role="alert" className="text-danger">
            {error}
          </p>
          <Link href="/music">
            <Button variant="secondary" size="sm">
              إعادة المحاولة
            </Button>
          </Link>
        </div>
      ) : tracks.length === 0 ? (
        <EmptyState
          icon={<MusicIcon className="size-6" />}
          title="لا توجد أغاني منشورة"
          description="ستظهر الأغاني في الكتالوج بعد نشرها من مكتبة الفنان."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted text-sm">{total} أغنية منشورة</p>
            {totalPages > 1 ? (
              <p className="text-muted text-sm tabular-nums">
                الصفحة {page} من {totalPages}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visibleTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onPlay={(selected) => setTrack(selected, visibleTracks)}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav
              aria-label="التنقل بين صفحات الموسيقى"
              className="flex items-center justify-between gap-3 pt-2"
            >
              {page > 1 ? (
                <Link href={`/music?page=${page - 1}`}>
                  <Button variant="secondary" size="sm" className="gap-1.5">
                    <PreviousIcon className="size-4" />
                    السابق
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="sm" disabled className="gap-1.5">
                  <PreviousIcon className="size-4" />
                  السابق
                </Button>
              )}

              <span className="text-muted text-sm tabular-nums">
                {page} / {totalPages}
              </span>

              {hasMore ? (
                <Link href={`/music?page=${page + 1}`}>
                  <Button variant="secondary" size="sm" className="gap-1.5">
                    التالي
                    <NextIcon className="size-4" />
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="sm" disabled className="gap-1.5">
                  التالي
                  <NextIcon className="size-4" />
                </Button>
              )}
            </nav>
          ) : null}
        </>
      )}
    </main>
  );
}

export default function MusicPage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center py-20">
          <Spinner className="size-6" />
        </main>
      }
    >
      <MusicPageContent />
    </Suspense>
  );
}
