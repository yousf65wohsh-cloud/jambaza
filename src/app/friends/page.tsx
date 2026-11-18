import type { Metadata } from "next";

import { FriendsActivityPanel } from "@/components/friends/FriendsActivityPanel";
import { FriendsClient } from "@/components/friends/FriendsClient";
import { ListeningInvitesPanel } from "@/components/friends/ListeningInvitesPanel";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "الأصدقاء",
};

export default function FriendsPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="الأصدقاء"
        description="تابع من يستمع الآن، وأضف أصدقاءك برمز الصديق أو بالبحث في شريط التنقل، وأدر طلبات الصداقة."
      />

      <div className="grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
        <aside
          aria-label="نشاط الأصدقاء ودعوات الاستماع"
          className="space-y-4 lg:sticky lg:top-20"
        >
          <ListeningInvitesPanel />
          <FriendsActivityPanel />
        </aside>

        <FriendsClient />
      </div>
    </main>
  );
}
