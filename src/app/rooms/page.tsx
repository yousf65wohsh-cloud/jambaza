"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { RoomMembersPanel } from "@/components/rooms/RoomMembersPanel";
import { RoomsClient } from "@/components/rooms/RoomsClient";
import { HeadphonesIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/Spinner";
import { useListeningSessionStore } from "@/stores/listeningSession";

function RoomsPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  // Playback always lives in the floating window, never in this page, so
  // leaving the room page keeps the session playing. Opening a room here simply
  // hands its id to that window (without overwriting a known peer name).
  useEffect(() => {
    if (!id) return;

    const session = useListeningSessionStore.getState();

    if (session.roomId !== id) {
      session.open({ roomId: id, peerName: null });
    }
  }, [id]);

  if (id) {
    return (
      <main className="space-y-6">
        <PageHeader
          eyebrow="غرفة استماع"
          title="استمعوا معاً"
          description="المضيف يتحكم بالمقطع، والأعضاء يستقبلون المزامنة تلقائياً."
        />

        <p className="bg-accent/10 border-accent/25 text-accent flex items-center gap-2 rounded-xl border px-3 py-2 text-xs leading-5">
          <HeadphonesIcon className="size-4 shrink-0" />
          الاستماع يعمل في النافذة العائمة أسفل الشاشة، ويستمر عند تنقّلك بين الصفحات.
        </p>

        <RoomMembersPanel roomId={id} />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <PageHeader
        title="الاستماع المشترك"
        description="أنشئ غرفة استماع وادعُ أصدقاءك المقبولين لمشاركة المقاطع."
      />

      <RoomsClient />
    </main>
  );
}

export default function RoomsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center py-20">
          <Spinner className="size-6" />
        </main>
      }
    >
      <RoomsPageContent />
    </Suspense>
  );
}
