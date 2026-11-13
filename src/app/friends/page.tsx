import type { Metadata } from "next";

import { FriendsClient } from "@/components/friends/FriendsClient";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "الأصدقاء",
};

export default function FriendsPage() {
  return (
    <main className="space-y-6">
      <PageHeader title="الأصدقاء" description="ابحث عن مستمعين، أرسل طلبات الصداقة، وأدر أصدقاءك." />

      <FriendsClient />
    </main>
  );
}
