"use client";

import { useEffect, useState } from "react";

import type { Playlist } from "@/types/playlist";

import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface RenamePlaylistDialogProps {
  playlist: Playlist | null;
  renaming: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

interface RenamePlaylistFormProps {
  playlist: Playlist;
  renaming: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

function RenamePlaylistForm({
  playlist,
  renaming,
  error,
  onCancel,
  onConfirm,
}: RenamePlaylistFormProps) {
  const [name, setName] = useState(playlist.name);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !renaming) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-playlist-title"
        className="card w-full max-w-md p-5 shadow-2xl"
      >
        <h2 id="rename-playlist-title" className="text-lg font-bold">
          إعادة تسمية قائمة التشغيل
        </h2>

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(name);
          }}
        >
          <Input
            label="الاسم الجديد"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            autoFocus
            error={error}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={renaming}>
              إلغاء
            </Button>
            <Button type="submit" loading={renaming}>
              حفظ
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RenamePlaylistDialog({
  playlist,
  renaming,
  error,
  onCancel,
  onConfirm,
}: RenamePlaylistDialogProps) {
  useEffect(() => {
    if (!playlist) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !renaming) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playlist, renaming, onCancel]);

  if (!playlist) return null;

  return (
    <RenamePlaylistForm
      key={playlist.id}
      playlist={playlist}
      renaming={renaming}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
