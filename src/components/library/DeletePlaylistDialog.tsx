"use client";

import { useEffect } from "react";

import type { Playlist } from "@/types/playlist";

import { Button } from "../ui/Button";

interface DeletePlaylistDialogProps {
  playlist: Playlist | null;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeletePlaylistDialog({
  playlist,
  deleting,
  error,
  onCancel,
  onConfirm,
}: DeletePlaylistDialogProps) {
  useEffect(() => {
    if (!playlist) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playlist, deleting, onCancel]);

  if (!playlist) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-playlist-title"
        aria-describedby="delete-playlist-description"
        className="card w-full max-w-md p-5 shadow-2xl"
      >
        <h2 id="delete-playlist-title" className="text-lg font-bold">
          حذف قائمة التشغيل؟
        </h2>
        <p id="delete-playlist-description" className="text-muted mt-2 text-sm leading-6">
          سيتم حذف «{playlist.name}» نهائياً. لن تُحذف الأغاني نفسها من الكتالوج أو من مكتبتك.
          لا يمكن التراجع عن هذا الإجراء.
        </p>

        {error ? (
          <p
            role="alert"
            className="bg-danger/10 border-danger/30 text-danger mt-4 rounded-xl border px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={deleting}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={deleting}>
            حذف القائمة
          </Button>
        </div>
      </div>
    </div>
  );
}
