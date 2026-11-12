"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError(null);

    if (!email.trim() || !password) {
      setError("أدخل البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(getAuthErrorMessage(signInError, "تعذّر تسجيل الدخول. حاول مرة أخرى."));
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(getAuthErrorMessage(cause, "حدث خطأ غير متوقع. تحقق من اتصالك وحاول مجدداً."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error ? (
        <p
          role="alert"
          className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      <Input
        label="البريد الإلكتروني"
        type="email"
        name="email"
        autoComplete="email"
        dir="ltr"
        className="text-left"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={loading}
        required
      />

      <Input
        label="كلمة المرور"
        type="password"
        name="password"
        autoComplete="current-password"
        dir="ltr"
        className="text-left"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={loading}
        required
      />

      <Button type="submit" className="w-full" size="lg" loading={loading}>
        {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
      </Button>

      <p className="text-muted text-center text-sm">
        ليس لديك حساب؟{" "}
        <Link href="/signup" className="text-accent font-bold hover:underline">
          أنشئ حساباً
        </Link>
      </p>
    </form>
  );
}
