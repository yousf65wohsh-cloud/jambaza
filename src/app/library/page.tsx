"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { LibraryClient } from "@/components/library/LibraryClient";
import { PlaylistsClient } from "@/components/library/PlaylistsClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";

function LibraryPageContent() {
  const searchParams = useSearchParams();
  const uploaded = searchParams.get("uploaded") === "1";
  const uploadDenied = searchParams.get("upload") === "denied";

  return (
    <main className="space-y-10">
      <PageHeader title="مكتبتي" description="قوائمك الشخصية وأغانيك المرفوعة." />

      <PlaylistsClient />

      <div className="border-border/70 border-t pt-10">
        <LibraryClient showSuccess={uploaded} uploadDenied={uploadDenied} />
      </div>
    </main>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center py-20">
          <Spinner className="size-6" />
        </main>
      }
    >
      <LibraryPageContent />
    </Suspense>
  );
}