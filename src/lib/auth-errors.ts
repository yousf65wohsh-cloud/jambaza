/**
 * Maps Supabase Auth errors to short Arabic messages while keeping the
 * original error out of the UI.
 */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (/invalid login credentials/i.test(message)) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }

  if (/email not confirmed/i.test(message)) {
    return "يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.";
  }

  if (/user already registered|already been registered/i.test(message)) {
    return "هذا البريد الإلكتروني مسجّل بالفعل. جرّب تسجيل الدخول.";
  }

  if (/password should be at least|password is too short/i.test(message)) {
    return "كلمة المرور قصيرة جداً. استخدم 6 أحرف على الأقل.";
  }

  if (/rate limit|too many requests|over_email_send_rate_limit/i.test(message)) {
    return "محاولات كثيرة في وقت قصير. انتظر قليلاً ثم حاول مجدداً.";
  }

  if (/invalid email/i.test(message)) {
    return "صيغة البريد الإلكتروني غير صحيحة.";
  }

  if (/network|fetch/i.test(message)) {
    return "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.";
  }

  return fallback;
}
