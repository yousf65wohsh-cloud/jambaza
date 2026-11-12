"use client";

import { useEffect } from "react";

import type { Track } from "@/types/track";

import { Button } from "../ui/Button";

interface DeleteTrackDialogProps {
  track: Track | null;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteTrackDialog({
  track,
  deleting,
  error,
  onCancel,
  onConfirm,
}: DeleteTrackDialogProps) {
  useEffect(() => {
    if (!track) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [track, deleting, onCancel]);

  if (!track) return null;

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
        aria-labelledby="delete-track-title"
        aria-describedby="delete-track-description"
        className="card w-full max-w-md p-5 shadow-2xl"
      >
        <h2 id="delete-track-title" className="text-lg font-bold">
          حذف الأغنية؟
        </h2>
        <p id="delete-track-description" className="text-muted mt-2 text-sm leading-6">
          سيتم حذف «{track.title}» وملف الصوت والغلاف من حسابك، مع نسختها المحفوظة للاستماع دون
          اتصال. لا يمكن التراجع عن هذا الإجراء.
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
            حذف الأغنية
          </Button>
        </div>
      </div>
    </div>
  );
}
