"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  createPlaylist,
  deletePlaylist,
  listMyPlaylists,
  renamePlaylist,
} from "@/lib/playlists/data";
import type { Playlist } from "@/types/playlist";

import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";
import { ListPlusIcon, MusicIcon, TrashIcon } from "../ui/icons";
import { DeletePlaylistDialog } from "./DeletePlaylistDialog";
import { RenamePlaylistDialog } from "./RenamePlaylistDialog";

function formatTrackCount(count: number): string {
  if (count === 0) {
    return "فارغة";
  }

  if (count === 1) {
    return "أغنية واحدة";
  }

  if (count === 2) {
    return "أغنيتان";
  }

  if (count <= 10) {
    return `${count} أغانٍ`;
  }

  return `${count} أغنية`;
}

export function PlaylistsClient() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [renameTarget, setRenameTarget] = useState<Playlist | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await listMyPlaylists();

      if (!active) return;

      if (result.ok) {
        setPlaylists(result.data);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;

    setCreating(true);
    setCreateError(null);
    setNotice(null);

    const result = await createPlaylist(name);

    if (!result.ok) {
      setCreateError(result.error.message);
      setCreating(false);
      return;
    }

    setName("");
    setCreating(false);
    setNotice("تم إنشاء قائمة التشغيل.");
    setReloadKey((current) => current + 1);
  }

  async function handleConfirmRename(nextName: string) {
    if (!renameTarget || renaming) return;

    setRenaming(true);
    setRenameError(null);

    const result = await renamePlaylist(renameTarget.id, nextName);

    if (!result.ok) {
      setRenameError(result.error.message);
      setRenaming(false);
      return;
    }

    setRenameTarget(null);
    setRenaming(false);
    setNotice("تم تغيير اسم قائمة التشغيل.");
    setReloadKey((current) => current + 1);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setDeleteError(null);

    const result = await deletePlaylist(deleteTarget.id);

    if (!result.ok) {
      setDeleteError(result.error.message);
      setDeleting(false);
      return;
    }

    setDeleteTarget(null);
    setDeleting(false);
    setNotice("تم حذف قائمة التشغيل.");
    setReloadKey((current) => current + 1);
  }

  return (
    <section className="space-y-4" aria-labelledby="playlists-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="playlists-heading" className="text-xl font-extrabold tracking-tight">
            قوائم التشغيل
          </h2>
          <p className="text-muted text-sm">قوائمك الشخصية. مشاركتها غير متاحة حالياً.</p>
        </div>
      </div>

      {notice ? (
        <p
          role="status"
          className="bg-success/10 border-success/30 text-success rounded-xl border px-3 py-2 text-sm"
        >
          {notice}
        </p>
      ) : null}

      <form
        onSubmit={handleCreate}
        className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <Input
            label="قائمة تشغيل جديدة"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="مثال: أغاني الصباح"
            maxLength={80}
            error={createError}
          />
        </div>
        <Button type="submit" loading={creating} className="gap-2 sm:shrink-0">
          <ListPlusIcon className="size-4" />
          إنشاء
        </Button>
      </form>

      {error ? (
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
      ) : null}

      {loading ? (
        <div className="border-border/80 bg-surface/50 flex items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10">
          <Spinner />
          <span className="text-muted text-sm">جارٍ تحميل قوائم التشغيل...</span>
        </div>
      ) : playlists.length === 0 && !error ? (
        <EmptyState
          icon={<MusicIcon className="size-6" />}
          title="لا توجد قوائم تشغيل"
          description="أنشئ قائمة جديدة لتجمع أغانيك المفضلة في مكان واحد."
        />
      ) : playlists.length > 0 ? (
        <ul className="space-y-2">
          {playlists.map((playlist) => (
            <li key={playlist.id} className="card flex flex-wrap items-center gap-3 p-4">
              <Link href={`/playlists/${playlist.id}`} className="min-w-0 flex-1 space-y-0.5">
                <span className="hover:text-accent block truncate font-bold transition-colors">
                  {playlist.name}
                </span>
                <span className="text-muted block text-xs">
                  {formatTrackCount(playlist.trackCount)}
                </span>
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRenameTarget(playlist);
                    setRenameError(null);
                  }}
                >
                  إعادة التسمية
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(playlist);
                    setDeleteError(null);
                  }}
                  aria-label={`حذف ${playlist.name}`}
                  title="حذف القائمة"
                  className="text-muted hover:text-danger hover:bg-danger/10 grid size-9 shrink-0 place-items-center rounded-lg transition-colors"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <RenamePlaylistDialog
        playlist={renameTarget}
        renaming={renaming}
        error={renameError}
        onCancel={() => {
          if (!renaming) {
            setRenameTarget(null);
            setRenameError(null);
          }
        }}
        onConfirm={(nextName) => void handleConfirmRename(nextName)}
      />

      <DeletePlaylistDialog
        playlist={deleteTarget}
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
    </section>
  );
}
