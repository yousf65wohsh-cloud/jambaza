import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { UploadForm } from "@/components/upload/UploadForm";
import { getCurrentUserRole } from "@/lib/tracks/roles";
import { canUpload } from "@/lib/upload/access";

export const metadata: Metadata = {
  title: "رفع أغنية",
};

export default async function UploadPage() {
  const role = await getCurrentUserRole();

  if (!canUpload(role)) {
    redirect("/library?upload=denied");
  }

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <Link href="/library" className="text-muted hover:text-foreground text-xs font-medium">
          ← العودة إلى مكتبتي
        </Link>
        <PageHeader
          eyebrow="مكتبتي"
          title="رفع أغنية"
          description="ارفع ملفاً صوتياً من جهازك، وأضف غلافاً اختيارياً. تُرفع الملفات مباشرة إلى حسابك."
        />
      </div>

      <UploadForm />
    </main>
  );
}
