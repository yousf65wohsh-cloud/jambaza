"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { deleteTrack, listTracks, TRACKS_PAGE_SIZE } from "@/lib/tracks/data";
import { formatDuration } from "@/lib/tracks/format";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player";
import type { Track } from "@/types/track";

import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { LibraryIcon, MusicIcon, TrashIcon, UploadIcon } from "../ui/icons";
import { Spinner } from "../ui/Spinner";
import { DeleteTrackDialog } from "./DeleteTrackDialog";

function TrackCover({ track }: { track: Track }) {
  if (!track.coverUrl) {
    return (
      <div className="bg-surface-2 text-muted grid size-12 shrink-0 place-items-center rounded-lg">
        <MusicIcon className="size-5" />
      </div>
    );
  }

  return (
    // Supabase cover URLs are public URLs; next/image is not used for them.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={track.coverUrl}
      alt={`غلاف ${track.title}`}
      loading="lazy"
      className="bg-surface-2 size-12 shrink-0 rounded-lg object-cover"
    />
  );
}

export function LibraryClient({ showSuccess }: { showSuccess: boolean }) {
  const setTrack = usePlayerStore((state) => state.setTrack);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    showSuccess ? "تم رفع الأغنية بنجاح." : null,
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Track | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInitialPage() {
      setLoading(true);
      setError(null);

      const result = await listTracks({ limit: TRACKS_PAGE_SIZE, offset: 0 });

      if (!active) return;

      if (result.ok) {
        setTracks(result.data.tracks);
        setHasMore(result.data.hasMore);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
    }

    void loadInitialPage();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function handleLoadMore() {
    if (loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError(null);

    const result = await listTracks({ limit: TRACKS_PAGE_SIZE, offset: tracks.length });

    if (result.ok) {
      setTracks((current) => [...current, ...result.data.tracks]);
      setHasMore(result.data.hasMore);
    } else {
      setLoadMoreError(result.error.message);
    }

    setLoadingMore(false);
  }

  function handlePlay(track: Track) {
    setTrack(track, tracks);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setDeleteError(null);

    const result = await deleteTrack(deleteTarget);

    if (!result.ok) {
      setDeleteError(result.error.message);
      setDeleting(false);
      return;
    }

    const deletedTrack = deleteTarget;
    const remainingTracks = tracks.filter((track) => track.id !== deletedTrack.id);

    setTracks(remainingTracks);
    setDeleteTarget(null);
    setDeleting(false);
    setNotice("تم حذف الأغنية.");

    const player = usePlayerStore.getState();
    if (player.currentTrack?.id === deletedTrack.id) {
      player.clear();
    } else {
      player.setQueue(player.queue.filter((track) => track.id !== deletedTrack.id));
    }
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <p
          role="status"
          className="bg-success/10 border-success/30 text-success rounded-xl border px-3 py-2 text-sm"
        >
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          {tracks.length > 0 ? `${tracks.length} أغنية في مكتبتك` : "مكتبتك"}
        </p>
        <Link href="/library/upload">
          <Button size="sm" className="gap-2">
            <UploadIcon className="size-4" />
            رفع أغنية
          </Button>
        </Link>
      </div>

      {error ? (
        <div className="border-danger/30 bg-danger/5 rounded-xl border p-4 text-sm">
          <p role="alert" className="text-danger">
            {error}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="border-border/80 bg-surface/50 flex items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-14">
          <Spinner />
          <span className="text-muted text-sm">جارٍ تحميل مكتبتك...</span>
        </div>
      ) : tracks.length === 0 && !error ? (
        <EmptyState
          icon={<LibraryIcon className="size-6" />}
          title="مكتبتك فارغة"
          description="لم تُضف أغاني بعد. ارفع ملفاً صوتياً من جهازك لتظهر أغانيك هنا."
          action={
            <Link href="/library/upload">
              <Button className="gap-2">
                <UploadIcon className="size-4" />
                رفع أول أغنية
              </Button>
            </Link>
          }
        />
      ) : tracks.length > 0 ? (
        <ul className="space-y-2">
          {tracks.map((track) => (
            <li key={track.id} className="card flex items-center gap-2 p-3">
              <button
                type="button"
                onClick={() => handlePlay(track)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start",
                  "transition-opacity hover:opacity-80 focus-visible:opacity-80",
                )}
                aria-label={`تشغيل ${track.title}`}
              >
                <TrackCover track={track} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{track.title}</span>
                  <span className="text-muted block truncate text-xs">
                    {track.artist || "فنان غير معروف"}
                  </span>
                </span>
              </button>

              <span className="text-muted shrink-0 text-xs tabular-nums">
                {formatDuration(track.durationSeconds)}
              </span>

              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(track);
                  setDeleteError(null);
                }}
                aria-label={`حذف ${track.title}`}
                title="حذف الأغنية"
                className="text-muted hover:text-danger hover:bg-danger/10 grid size-9 shrink-0 place-items-center rounded-lg transition-colors"
              >
                <TrashIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {loadMoreError ? (
        <div className="space-y-2 text-center">
          <p role="alert" className="text-danger text-sm">
            {loadMoreError}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void handleLoadMore()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      {hasMore && !loading ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            loading={loadingMore}
            onClick={() => void handleLoadMore()}
          >
            تحميل المزيد
          </Button>
        </div>
      ) : null}

      <DeleteTrackDialog
        track={deleteTarget}
        deleting={deleting}
        error={deleteError}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
