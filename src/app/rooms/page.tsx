"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { RoomClient } from "@/components/rooms/RoomClient";
import { RoomMembersPanel } from "@/components/rooms/RoomMembersPanel";
import { RoomsClient } from "@/components/rooms/RoomsClient";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { HeadphonesIcon } from "@/components/ui/icons";

function RoomsPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (id) {
    return (
      <>
        <RoomClient roomId={id} />
        <RoomMembersPanel roomId={id} />
      </>
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