"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const USERNAME_PATTERN = /^[\p{L}\p{N}_]{3,30}$/u;

export function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError(null);

    const trimmedUsername = username.trim();
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setError("اسم المستخدم يجب أن يكون بين 3 و30 حرفاً، ويحتوي على حروف أو أرقام فقط.");
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: trimmedUsername,
            display_name: displayName.trim() || trimmedUsername,
          },
        },
      });

      if (signUpError) {
        setError(getAuthErrorMessage(signUpError, "تعذّر إنشاء الحساب. حاول مرة أخرى."));
        return;
      }

      // Supabase returns a user with no identities when the email is already
      // registered (to avoid account enumeration).
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("هذا البريد الإلكتروني مسجّل بالفعل. جرّب تسجيل الدخول.");
        return;
      }

      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }

      setSuccess(true);
    } catch (cause) {
      setError(getAuthErrorMessage(cause, "حدث خطأ غير متوقع. تحقق من اتصالك وحاول مجدداً."));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <p
          role="status"
          className="bg-success/10 border-success/30 text-success rounded-xl border px-3 py-3 text-sm leading-6"
        >
          تم إنشاء حسابك. أرسلنا رسالة تأكيد إلى بريدك الإلكتروني — أكّد الحساب ثم سجّل الدخول.
        </p>
        <Link
          href="/login"
          className="text-accent inline-block text-sm font-bold hover:underline"
        >
          العودة إلى تسجيل الدخول
        </Link>
      </div>
    );
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
        label="اسم المستخدم"
        type="text"
        name="username"
        autoComplete="username"
        placeholder="مثال: layla_music"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        disabled={loading}
        required
        hint="3 إلى 30 حرفاً، بدون مسافات."
      />

      <Input
        label="الاسم الظاهر"
        type="text"
        name="displayName"
        autoComplete="name"
        placeholder="مثال: ليلى"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        disabled={loading}
      />

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
        autoComplete="new-password"
        dir="ltr"
        className="text-left"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={loading}
        required
      />

      <Input
        label="تأكيد كلمة المرور"
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        dir="ltr"
        className="text-left"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        disabled={loading}
        required
      />

      <Button type="submit" className="w-full" size="lg" loading={loading}>
        {loading ? "جارٍ إنشاء الحساب..." : "إنشاء حساب"}
      </Button>

      <p className="text-muted text-center text-sm">
        لديك حساب بالفعل؟{" "}
        <Link href="/login" className="text-accent font-bold hover:underline">
          سجّل الدخول
        </Link>
      </p>
    </form>
  );
}
