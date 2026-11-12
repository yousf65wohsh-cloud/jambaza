import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { UsersIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "الأصدقاء",
};

export default function FriendsPage() {
  return (
    <main className="space-y-6">
      <PageHeader title="الأصدقاء" description="تابع أصدقاءك، استكشف قوائمهم، واستمعوا معاً." />

      <EmptyState
        icon={<UsersIcon className="size-6" />}
        title="لا يوجد أصدقاء بعد"
        description="إضافة الأصدقاء وطلبات الصداقة ستصل في المرحلة التالية."
      />
    </main>
  );
}
