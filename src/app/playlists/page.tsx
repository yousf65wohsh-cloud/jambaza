"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { PlaylistClient } from "@/components/playlists/PlaylistClient";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { MusicIcon } from "@/components/ui/icons";

function PlaylistsPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";

  if (!id) {
    return (
      <main className="space-y-6">
        <EmptyState
          icon={<MusicIcon className="size-6" />}
          title="قائمة التشغيل غير محددة"
          description="اختر قائمة تشغيل من مكتبتك لعرض محتواها."
          action={
            <Link href="/library">
              <Button variant="secondary" size="sm">
                العودة إلى مكتبتي
              </Button>
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <PlaylistClient playlistId={id} />
    </main>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center py-20">
          <Spinner className="size-6" />
        </main>
      }
    >
      <PlaylistsPageContent />
    </Suspense>
  );
}