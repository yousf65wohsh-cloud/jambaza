import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LibraryIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "مكتبتي",
};

export default function LibraryPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="مكتبتي"
        description="أغانيك المرفوعة وقوائم التشغيل الخاصة بك."
      />

      <EmptyState
        icon={<LibraryIcon className="size-6" />}
        title="مكتبتك فارغة"
        description="لم تُضف أغاني بعد. الرفع وقوائم التشغيل سيصلان في المرحلة التالية."
        action={
          <Link href="/">
            <Button variant="secondary" size="sm">
              العودة إلى الرئيسية
            </Button>
          </Link>
        }
      />
    </main>
  );
}
