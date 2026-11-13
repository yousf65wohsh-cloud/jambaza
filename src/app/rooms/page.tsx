import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { RoomsClient } from "@/components/rooms/RoomsClient";

export const metadata: Metadata = {
  title: "الاستماع المشترك",
};

export default function RoomsPage() {
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
