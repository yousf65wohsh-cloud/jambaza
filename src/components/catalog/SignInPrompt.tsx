import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MusicIcon } from "@/components/ui/icons";

export function SignInPrompt() {
  return (
    <EmptyState
      icon={<MusicIcon className="size-6" />}
      title="سجّل الدخول لتصفح الموسيقى"
      description="الكتالوج متاح لحسابات المستمعين. سجّل الدخول أو أنشئ حساباً جديداً للاستماع إلى الأغاني المنشورة وتقييمها."
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/login">
            <Button size="sm">تسجيل الدخول</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" variant="secondary">
              إنشاء حساب
            </Button>
          </Link>
        </div>
      }
    />
  );
}
