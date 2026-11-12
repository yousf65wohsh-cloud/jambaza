import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { UploadDebugProbe } from "@/components/upload/UploadDebugProbe";
import { UploadForm } from "@/components/upload/UploadForm";

export const metadata: Metadata = {
  title: "رفع أغنية",
};

export default function UploadPage() {
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

      {/* TEMP-DEBUG: connectivity probe; it renders nothing unless the flag is on. */}
      <UploadDebugProbe />
    </main>
  );
}
