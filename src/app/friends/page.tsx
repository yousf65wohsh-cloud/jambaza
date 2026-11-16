import type { Metadata } from "next";

import { FriendsClient } from "@/components/friends/FriendsClient";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "الأصدقاء",
};

export default function FriendsPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="الأصدقاء"
        description="أضف أصدقاءك برمز الصديق أو بالبحث، وأدر طلبات الصداقة."
      />

      <FriendsClient />
    </main>
  );
}
