import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { WifiOffIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "دون اتصال",
};

export default function OfflinePage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="أنت غير متصل بالإنترنت"
        description=" يمكنك متابعة استخدام الأجزاء المحفوظة من التطبيق."
      />

      <EmptyState
        icon={<WifiOffIcon className="size-6" />}
        title="لا يوجد اتصال"
        description="ستعود الصفحات إلى العمل عند استعادة الاتصال. التشغيل دون اتصال متاح فقط للملفات الصوتية التي رفعتها بنفسك وحفظتها على هذا الجهاز."
      />
    </main>
  );
}
