import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="text-accent text-3xl font-extrabold">
            جمبزة
          </Link>
          <h1 className="mt-4 text-2xl font-bold">تسجيل الدخول</h1>
          <p className="text-muted mt-1 text-sm">أهلاً بعودتك. تابع الاستماع من حيث توقفت.</p>
        </div>

        <Card>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
