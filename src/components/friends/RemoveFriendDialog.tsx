"use client";

import { useEffect } from "react";

import type { FriendProfile } from "@/lib/friends/mapping";

import { Button } from "../ui/Button";

interface RemoveFriendDialogProps {
  friend: FriendProfile | null;
  removing: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveFriendDialog({
  friend,
  removing,
  error,
  onCancel,
  onConfirm,
}: RemoveFriendDialogProps) {
  useEffect(() => {
    if (!friend) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !removing) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [friend, removing, onCancel]);

  if (!friend) return null;

  const name = friend.displayName || friend.username;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !removing) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-friend-title"
        aria-describedby="remove-friend-description"
        className="card w-full max-w-md p-5 shadow-2xl"
      >
        <h2 id="remove-friend-title" className="text-lg font-bold">
          إزالة الصديق؟
        </h2>
        <p id="remove-friend-description" className="text-muted mt-2 text-sm leading-6">
          سيتم حذف الصداقة مع «{name}». لن ترى قوائمه ولن يرى قوائمك، ويمكنكما إرسال طلب
          صداقة جديد لاحقاً.
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
          <Button variant="secondary" onClick={onCancel} disabled={removing}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={removing}>
            إزالة الصديق
          </Button>
        </div>
      </div>
    </div>
  );
}
