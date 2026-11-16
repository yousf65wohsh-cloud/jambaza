import type { Metadata } from "next";

import { LibraryClient } from "@/components/library/LibraryClient";
import { PlaylistsClient } from "@/components/library/PlaylistsClient";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "مكتبتي",
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string | string[]; upload?: string | string[] }>;
}) {
  const params = await searchParams;
  const uploaded = Array.isArray(params.uploaded)
    ? params.uploaded.includes("1")
    : params.uploaded === "1";
  const uploadDenied = Array.isArray(params.upload)
    ? params.upload.includes("denied")
    : params.upload === "denied";

  return (
    <main className="space-y-10">
      <PageHeader
        title="مكتبتي"
        description="قوائمك الشخصية وأغانيك المرفوعة."
      />

      <PlaylistsClient />

      <div className="border-border border-t pt-8">
        <LibraryClient showSuccess={uploaded} uploadDenied={uploadDenied} />
      </div>
    </main>
  );
}
