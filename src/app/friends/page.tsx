import type { Metadata } from "next";

import { FriendsActivityPanel } from "@/components/friends/FriendsActivityPanel";
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
        description="تابع من يستمع الآن، وأضف أصدقاءك برمز الصديق أو بالبحث، وأدر طلبات الصداقة."
      />

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
        <aside aria-label="الأصدقاء الذين يستمعون الآن">
          <FriendsActivityPanel />
        </aside>

        <FriendsClient />
      </div>
    </main>
  );
}
