"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { UploadForm } from "@/components/upload/UploadForm";
import { getCurrentUserRole } from "@/lib/tracks/roles";
import { canUpload } from "@/lib/upload/access";

export default function UploadPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    async function check() {
      const role = await getCurrentUserRole();
      if (!active) return;

      if (!canUpload(role)) {
        setAllowed(false);
        router.replace("/library?upload=denied");
        return;
      }

      setAllowed(true);
    }

    void check();

    return () => {
      active = false;
    };
  }, [router]);

  if (allowed !== true) {
    return (
      <main className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </main>
    );
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