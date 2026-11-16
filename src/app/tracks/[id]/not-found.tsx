import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MusicIcon } from "@/components/ui/icons";

export default function TrackNotFound() {
  return (
    <main className="space-y-6">
      <EmptyState
        icon={<MusicIcon className="size-6" />}
        title="الأغنية غير موجودة"
        description="قد تكون الأغنية غير منشورة أو تم حذفها من الكتالوج."
        action={
          <Link href="/music">
            <Button variant="secondary" size="sm">
              العودة إلى الموسيقى
            </Button>
          </Link>
        }
      />
    </main>
  );
}
