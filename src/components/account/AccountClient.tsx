"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  changeMyPassword,
  getMyAccount,
  saveMyAccount,
  type AccountProfile,
} from "@/lib/account/data";
import { validateNewPassword, MAX_DISPLAY_NAME_LENGTH } from "@/lib/account/validation";
import { validateCoverFile } from "@/lib/upload/validation";

import { Button } from "../ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { ImageIcon, UserIcon } from "../ui/icons";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";

const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

function successMessage(message: string) {
  return (
    <p
      role="status"
      className="rounded-xl border border-accent/30 bg-accent/10 text-accent px-3 py-2 text-sm"
    >
      {message}
    </p>
  );
}

function errorMessage(message: string) {
  return (
    <p
      role="alert"
      className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-3 py-2 text-sm"
    >
      {message}
    </p>
  );
}

export function AccountClient() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const previewUrlRef = useRef<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const result = await getMyAccount();

      if (!active) return;

      if (result.ok) {
        setProfile(result.data);
        setDisplayName(result.data.displayName ?? "");
      } else {
        setLoadError(result.error.message);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function replaceAvatarPreview(file: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!file) {
      setAvatarPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setAvatarPreview(url);
  }

  function handleAvatarChange(file: File | null) {
    setAvatarError(null);
    setProfileSuccess(null);

    if (!file) {
      setAvatarFile(null);
      replaceAvatarPreview(null);
      return;
    }

    const validation = validateCoverFile(file);

    if (!validation.ok) {
      setAvatarFile(null);
      replaceAvatarPreview(null);
      setAvatarInputKey((key) => key + 1);
      setAvatarError(validation.message);
      return;
    }

    setAvatarFile(file);
    replaceAvatarPreview(file);
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingProfile) return;

    setProfileError(null);
    setProfileSuccess(null);

    if (!profile) {
      setProfileError("لم يتم تحميل بيانات الحساب بعد.");
      return;
    }

    setSavingProfile(true);
    const result = await saveMyAccount({ displayName, avatarFile });

    if (result.ok) {
      setProfile(result.data);
      setDisplayName(result.data.displayName ?? "");
      setAvatarFile(null);
      replaceAvatarPreview(null);
      setAvatarInputKey((key) => key + 1);
      setProfileSuccess("تم حفظ بيانات الحساب.");
    } else {
      setProfileError(result.error.message);
    }

    setSavingProfile(false);
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingPassword) return;

    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword) {
      setPasswordError("أدخل كلمة المرور الجديدة.");
      return;
    }

    const validation = validateNewPassword(newPassword);

    if (!validation.ok) {
      setPasswordError(validation.message);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setSavingPassword(true);
    const result = await changeMyPassword(newPassword);

    if (result.ok) {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("تم تغيير كلمة المرور بنجاح.");
    } else {
      setPasswordError(result.error.message);
    }

    setSavingPassword(false);
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-3 py-10 text-sm">
        <Spinner />
        <span className="text-muted">جارٍ تحميل بيانات الحساب...</span>
      </Card>
    );
  }

  if (loadError || !profile) {
    return (
      <Card>
        {errorMessage(loadError ?? "تعذّر تحميل بيانات الحساب.")}
      </Card>
    );
  }

  const avatarSrc = avatarPreview ?? profile.avatarUrl;
  const initial = (profile.displayName ?? profile.username).trim().charAt(0);
  const busy = savingProfile || savingPassword;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>الملف الشخصي</CardTitle>
          <CardDescription>
            عدّل اسمك المعروض وصورتك الشخصية. تُعرض هذه البيانات لأصدقائك.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleProfileSubmit} className="space-y-5" noValidate aria-busy={savingProfile}>
          {profileError ? errorMessage(profileError) : null}
          {profileSuccess ? successMessage(profileSuccess) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="border-border bg-surface-2 grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border">
              {avatarSrc ? (
                // Local object URL or public Supabase URL; optimization is not needed.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="الصورة الشخصية"
                  className="h-full w-full object-cover"
                />
              ) : initial ? (
                <span className="text-2xl font-extrabold" aria-hidden="true">
                  {initial}
                </span>
              ) : (
                <UserIcon className="text-muted size-8" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <Input
                key={avatarInputKey}
                label="الصورة الشخصية"
                name="avatar"
                type="file"
                accept={AVATAR_ACCEPT}
                onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
                disabled={savingProfile}
                error={avatarError}
                hint="JPG أو PNG أو WebP — بحد أقصى 5 ميجابايت."
              />
              {avatarFile ? (
                <p className="text-muted flex items-center gap-1.5 text-xs" dir="auto">
                  <ImageIcon className="size-4" />
                  {avatarFile.name}
                </p>
              ) : null}
            </div>
          </div>

          <Input
            label="اسم المستخدم"
            name="username"
            type="text"
            value={profile.username}
            readOnly
            disabled
            hint="اسم المستخدم غير قابل للتعديل."
            dir="auto"
          />

          <Input
            label="الاسم المعروض"
            name="displayName"
            type="text"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setProfileError(null);
              setProfileSuccess(null);
            }}
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            placeholder="مثال: ليلى"
            disabled={savingProfile}
            hint={`اتركه فارغاً لاستخدام اسم المستخدم. حتى ${MAX_DISPLAY_NAME_LENGTH} حرفاً.`}
            dir="auto"
          />

          <div className="flex justify-end">
            <Button type="submit" loading={savingProfile} disabled={busy}>
              {savingProfile ? "جارٍ حفظ الملف الشخصي..." : "حفظ الملف الشخصي"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تغيير كلمة المرور</CardTitle>
          <CardDescription>
            أدخل كلمة مرور جديدة مكوّنة من 8 أحرف على الأقل. ستبقى جلستك الحالية
            مسجّلة بعد التغيير.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handlePasswordSubmit} className="space-y-5" noValidate aria-busy={savingPassword}>
          {passwordError ? errorMessage(passwordError) : null}
          {passwordSuccess ? successMessage(passwordSuccess) : null}

          <Input
            label="كلمة المرور الجديدة"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              setPasswordError(null);
              setPasswordSuccess(null);
            }}
            autoComplete="new-password"
            placeholder="8 أحرف على الأقل"
            disabled={savingPassword}
          />

          <Input
            label="تأكيد كلمة المرور"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setPasswordError(null);
              setPasswordSuccess(null);
            }}
            autoComplete="new-password"
            placeholder="أعد كتابة كلمة المرور"
            disabled={savingPassword}
          />

          <div className="flex justify-end">
            <Button type="submit" loading={savingPassword} disabled={busy}>
              {savingPassword ? "جارٍ تغيير كلمة المرور..." : "تغيير كلمة المرور"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
