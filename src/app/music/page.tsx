import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TrackCard } from "@/components/catalog/TrackCard";
import { SignInPrompt } from "@/components/catalog/SignInPrompt";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MusicIcon, NextIcon, PreviousIcon } from "@/components/ui/icons";
import { hasCatalogSession, listAll } from "@/lib/catalog/data";

export const metadata: Metadata = {
  title: "الموسيقى",
};

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function MusicPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const hasSession = await hasCatalogSession();

  if (!hasSession) {
    return (
      <main className="space-y-6">
        <PageHeader
          title="الموسيقى"
          description="كل الأغاني المنشورة في الكتالوج. اختر أغنية لعرض تفاصيلها وتقييمها والتعليق عليها."
        />
        <SignInPrompt />
      </main>
    );
  }

  const result = await listAll(page);

  if (result.ok) {
    const totalPages = Math.max(1, Math.ceil(result.data.total / result.data.pageSize));

    if (result.data.total > 0 && page > totalPages) {
      redirect(`/music?page=${totalPages}`);
    }
  }

  const totalPages = result.ok
    ? Math.max(1, Math.ceil(result.data.total / result.data.pageSize))
    : 1;

  return (
    <main className="space-y-6">
      <PageHeader
        title="الموسيقى"
        description="كل الأغاني المنشورة في الكتالوج. اختر أغنية لعرض تفاصيلها وتقييمها والتعليق عليها."
      />

      {!result.ok ? (
        <div className="border-danger/30 bg-danger/5 space-y-3 rounded-xl border p-4 text-sm">
          <p role="alert" className="text-danger">
            {result.error.message}
          </p>
          <Link href="/music">
            <Button variant="secondary" size="sm">
              إعادة المحاولة
            </Button>
          </Link>
        </div>
      ) : result.data.tracks.length === 0 ? (
        <EmptyState
          icon={<MusicIcon className="size-6" />}
          title="لا توجد أغاني منشورة"
          description="ستظهر الأغاني في الكتالوج بعد نشرها من مكتبة الفنان."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted text-sm">{result.data.total} أغنية منشورة</p>
            {totalPages > 1 ? (
              <p className="text-muted text-sm tabular-nums">
                الصفحة {page} من {totalPages}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {result.data.tracks.map((track) => (
              <TrackCard key={track.id} track={track} />
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

              {result.data.hasMore ? (
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
