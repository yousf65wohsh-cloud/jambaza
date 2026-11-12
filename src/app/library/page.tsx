import type { Metadata } from "next";

import { LibraryClient } from "@/components/library/LibraryClient";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "مكتبتي",
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string | string[] }>;
}) {
  const params = await searchParams;
  const uploaded = Array.isArray(params.uploaded)
    ? params.uploaded.includes("1")
    : params.uploaded === "1";

  return (
    <main className="space-y-6">
      <PageHeader
        title="مكتبتي"
        description="أغانيك المرفوعة. اضغط على أي أغنية لتشغيلها أو احذفها من مكتبتك."
      />

      <LibraryClient showSuccess={uploaded} />
    </main>
  );
}
