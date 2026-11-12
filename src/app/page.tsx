import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MusicIcon } from "@/components/ui/icons";

export default function HomePage() {
  return (
    <main className="space-y-8">
      <PageHeader
        eyebrow="أهلاً بك في جمبزة"
        title="استمع مع أصدقائك"
        description="موسيقاك، قوائمك، وجلسات الاستماع المشتركة — كلها في مكان واحد."
      />

      <EmptyState
        icon={<MusicIcon className="size-6" />}
        title="لا شيء يُشغّل الآن"
        description="مكتبتك فارغة حتى الآن. ستظهر أغانيك وقوائم التشغيل هنا بعد إضافتها."
        action={
          <Link href="/library">
            <Button variant="secondary" size="sm">
              الذهاب إلى مكتبتي
            </Button>
          </Link>
        }
      />
    </main>
  );
}
