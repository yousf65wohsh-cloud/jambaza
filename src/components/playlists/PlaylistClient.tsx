"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getPlaylist, removeTrackFromPlaylist } from "@/lib/playlists/data";
import { formatDuration } from "@/lib/tracks/format";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player";
import type { PlaylistDetails } from "@/types/playlist";
import type { Track } from "@/types/track";

import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Spinner } from "../ui/Spinner";
import { MusicIcon, PlayIcon, TrashIcon } from "../ui/icons";

function TrackCover({ track }: { track: Track }) {
  if (!track.coverUrl) {
    return (
      <div className="bg-surface-2 text-muted grid size-12 shrink-0 place-items-center rounded-control">
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
      className="bg-surface-2 size-12 shrink-0 rounded-control object-cover"
    />
  );
}

export function PlaylistClient({ playlistId }: { playlistId: string }) {
  const setTrack = usePlayerStore((state) => state.setTrack);
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null);

  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await getPlaylist(playlistId);

      if (!active) return;

      if (result.ok) {
        setPlaylist(result.data);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [playlistId, reloadKey]);

  function handlePlay(track: Track) {
    if (!playlist) return;
    setTrack(track, playlist.tracks);
  }

  async function handleRemove(track: Track) {
    if (removingId) return;

    setRemovingId(track.id);
    setActionError(null);
    setNotice(null);

    const result = await removeTrackFromPlaylist(playlistId, track.id);

    if (!result.ok) {
      setActionError(result.error.message);
      setRemovingId(null);
      return;
    }

    setPlaylist((current) =>
      current
        ? {
            ...current,
            tracks: current.tracks.filter((item) => item.id !== track.id),
            trackCount: Math.max(0, current.trackCount - 1),
          }
        : current,
    );
    setRemovingId(null);
    setNotice("تمت إزالة الأغنية من قائمة التشغيل.");

    // Keep the player's queue in sync if it still contains the removed track.
    const player = usePlayerStore.getState();
    if (player.queue.some((item) => item.id === track.id)) {
      player.setQueue(player.queue.filter((item) => item.id !== track.id));
    }
  }

  if (loading) {
    return (
      <div className="border-border bg-surface/50 flex items-center justify-center gap-3 rounded-panel border border-dashed px-6 py-14">
        <Spinner />
        <span className="text-muted text-sm">جارٍ تحميل قائمة التشغيل...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <Link href="/library" className="text-muted hover:text-text text-xs font-medium">
          ← العودة إلى مكتبتي
        </Link>
        <div className="border-danger/30 bg-danger/5 rounded-xl border p-4 text-sm">
          <p role="alert" className="text-danger">
            {error}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="space-y-4">
        <Link href="/library" className="text-muted hover:text-text text-xs font-medium">
          ← العودة إلى مكتبتي
        </Link>
        <EmptyState
          icon={<MusicIcon className="size-6" />}
          title="قائمة التشغيل غير موجودة"
          description="قد تكون القائمة محذوفة أو أنك لا تملك صلاحية الوصول إليها."
          action={
            <Link href="/library">
              <Button variant="secondary">العودة إلى مكتبتي</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rise space-y-2">
        <Link href="/library" className="text-muted hover:text-text text-xs font-medium">
          ← العودة إلى مكتبتي
        </Link>
        <h1 dir="auto" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {playlist.name}
        </h1>
        <p className="text-muted text-sm">
          {playlist.tracks.length === 0
            ? "لا توجد أغاني في هذه القائمة."
            : `${playlist.tracks.length} أغنية`}
        </p>
      </div>

      {notice ? (
        <p
          role="status"
          className="bg-success/10 border-success/30 text-success rounded-xl border px-3 py-2 text-sm"
        >
          {notice}
        </p>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-3 py-2 text-sm"
        >
          {actionError}
        </p>
      ) : null}

      {playlist.tracks.length === 0 ? (
        <EmptyState
          icon={<MusicIcon className="size-6" />}
          title="القائمة فارغة"
          description="افتح صفحة أي أغنية واضغط «أضف إلى قائمة التشغيل» لإضافتها هنا."
          action={
            <Link href="/music">
              <Button variant="secondary">تصفح الموسيقى</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {playlist.tracks.map((track, index) => {
            const isActive = currentTrackId === track.id;
            const isRemoving = removingId === track.id;

            return (
              <li
                key={track.id}
                className={cn(
                  "card hover:border-accent/40 flex items-center gap-2 p-3 transition-colors",
                  isActive && "border-accent/50 bg-accent/5",
                )}
              >
                <button
                  type="button"
                  onClick={() => handlePlay(track)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start",
                    "transition-opacity hover:opacity-80 focus-visible:opacity-80",
                  )}
                  aria-label={`تشغيل ${track.title}`}
                >
                  <span className="text-muted w-5 shrink-0 text-center text-xs tabular-nums">
                    {index + 1}
                  </span>
                  <TrackCover track={track} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span dir="auto" className="block truncate text-sm font-bold">
                        {track.title}
                      </span>
                      {isActive ? (
                        <span className="text-accent flex shrink-0 items-center gap-1 text-[11px] font-bold">
                          <PlayIcon className="size-3" />
                          قيد التشغيل
                        </span>
                      ) : null}
                    </span>
                    <span dir="auto" className="text-muted block truncate text-xs">
                      {track.artist || "فنان غير معروف"}
                    </span>
                  </span>
                </button>

                <span className="text-muted shrink-0 text-xs tabular-nums">
                  {formatDuration(track.durationSeconds)}
                </span>

                <button
                  type="button"
                  onClick={() => void handleRemove(track)}
                  disabled={Boolean(removingId)}
                  aria-label={`إزالة ${track.title} من القائمة`}
                  title="إزالة من القائمة"
                  className="text-muted hover:text-danger hover:bg-danger/10 grid size-9 shrink-0 place-items-center rounded-control transition-colors disabled:opacity-40"
                >
                  {isRemoving ? <Spinner /> : <TrashIcon className="size-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
