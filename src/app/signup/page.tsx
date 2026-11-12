import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/components/auth/SignupForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "إنشاء حساب",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="text-accent text-3xl font-extrabold">
            جمبزة
          </Link>
          <h1 className="mt-4 text-2xl font-bold">إنشاء حساب</h1>
          <p className="text-muted mt-1 text-sm">انضم إلى جمبزة واستمع مع أصدقائك.</p>
        </div>

        <Card>
          <SignupForm />
        </Card>
      </div>
    </main>
  );
}
