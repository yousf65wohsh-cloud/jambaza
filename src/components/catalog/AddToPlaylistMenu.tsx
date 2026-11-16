"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { addTrackToPlaylist, listMyPlaylists } from "@/lib/playlists/data";
import type { Playlist } from "@/types/playlist";

import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { ListPlusIcon } from "../ui/icons";

export function AddToPlaylistMenu({ trackId }: { trackId: string }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function ensureLoaded() {
    if (playlists || loading) return;

    setLoading(true);
    setLoadError(null);

    const result = await listMyPlaylists();

    if (result.ok) {
      setPlaylists(result.data);
    } else {
      setLoadError(result.error.message);
    }

    setLoading(false);
  }

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    setNotice(null);
    setActionError(null);
    void ensureLoaded();
  }

  async function handleAdd(playlist: Playlist) {
    if (addingId) return;

    setAddingId(playlist.id);
    setActionError(null);
    setNotice(null);

    const result = await addTrackToPlaylist(playlist.id, trackId);

    if (!result.ok) {
      setActionError(result.error.message);
      setAddingId(null);
      return;
    }

    setNotice(`أُضيفت إلى «${playlist.name}».`);
    setAddingId(null);
  }

  return (
    <div ref={rootRef} className="relative inline-flex flex-col items-start gap-2">
      <Button
        variant="secondary"
        onClick={toggle}
        className="gap-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <ListPlusIcon className="size-4" />
        أضف إلى قائمة التشغيل
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="قوائم التشغيل"
          className="border-border bg-surface absolute start-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border p-2 shadow-xl"
        >
          {loading ? (
            <div className="text-muted flex items-center justify-center gap-2 px-3 py-4 text-sm">
              <Spinner />
              جارٍ تحميل القوائم...
            </div>
          ) : loadError ? (
            <div className="space-y-2 px-2 py-2 text-sm">
              <p role="alert" className="text-danger">
                {loadError}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPlaylists(null);
                  setLoadError(null);
                  void ensureLoaded();
                }}
              >
                إعادة المحاولة
              </Button>
            </div>
          ) : playlists && playlists.length === 0 ? (
            <div className="space-y-2 px-2 py-2 text-sm">
              <p className="text-muted">لا توجد قوائم تشغيل بعد.</p>
              <Link
                href="/library"
                className="text-accent hover:text-accent-hover font-medium"
                onClick={() => setOpen(false)}
              >
                أنشئ قائمة من مكتبتي
              </Link>
            </div>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-auto">
              {(playlists ?? []).map((playlist) => (
                <li key={playlist.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleAdd(playlist)}
                    disabled={Boolean(addingId)}
                    className="hover:bg-surface-2 focus-visible:bg-surface-2 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm transition-colors disabled:opacity-50"
                  >
                    <span className="min-w-0 truncate font-medium">{playlist.name}</span>
                    <span className="text-muted shrink-0 text-xs">
                      {addingId === playlist.id ? "..." : `${playlist.trackCount}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {actionError ? (
        <p role="alert" className="text-danger text-xs">
          {actionError}
        </p>
      ) : notice ? (
        <p role="status" className="text-success text-xs">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
