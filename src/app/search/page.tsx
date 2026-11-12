import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "البحث",
};

export default function SearchPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="البحث"
        description="ابحث عن أغنية، فنان، أو صديق — البحث الكامل قادم في المرحلة التالية."
      />

      <EmptyState
        icon={<SearchIcon className="size-6" />}
        title="ابحث عن شيء تحبه"
        description="لم نُفعّل البحث بعد. ستجد هنا نتائج الأغاني والفنانين والأصدقاء قريباً."
      />
    </main>
  );
}
