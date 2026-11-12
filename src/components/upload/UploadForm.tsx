"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { uploadTrack, type UploadProgress } from "@/lib/tracks/upload";
import { validateAudioFile, validateCoverFile } from "@/lib/upload/validation";

import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ImageIcon, UploadIcon } from "../ui/icons";
import { Input } from "../ui/Input";

const AUDIO_ACCEPT = "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg";
const COVER_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

type Phase = "idle" | "uploading";

function ProgressBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted tabular-nums">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="bg-surface-2 h-2 overflow-hidden rounded-full"
      >
        <div
          className="bg-accent h-full rounded-full transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function UploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const busy = phase !== "idle";

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function replaceCoverPreview(file: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!file) {
      setCoverPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setCoverPreview(url);
  }

  function handleAudioChange(file: File | null) {
    setAudioFile(file);
    setAudioError(null);
  }

  function handleCoverChange(file: File | null) {
    setCoverFile(file);
    setCoverError(null);
    replaceCoverPreview(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setFormError(null);
    setTitleError(null);
    setAudioError(null);
    setCoverError(null);

    const trimmedTitle = title.trim();
    let valid = true;

    if (!trimmedTitle) {
      setTitleError("عنوان الأغنية مطلوب.");
      valid = false;
    } else if (trimmedTitle.length > 120) {
      setTitleError("عنوان الأغنية يجب ألا يتجاوز 120 حرفاً.");
      valid = false;
    }

    if (!audioFile) {
      setAudioError("اختر ملف صوت للرفع.");
      valid = false;
    } else {
      const audioValidation = validateAudioFile(audioFile);
      if (!audioValidation.ok) {
        setAudioError(audioValidation.message);
        valid = false;
      }
    }

    if (coverFile) {
      const coverValidation = validateCoverFile(coverFile);
      if (!coverValidation.ok) {
        setCoverError(coverValidation.message);
        valid = false;
      }
    }

    if (!valid) return;

    setPhase("uploading");
    setProgress({ audio: 0, cover: coverFile ? 0 : null });

    const result = await uploadTrack({
      title: trimmedTitle,
      artist: artist.trim() || null,
      audioFile: audioFile as File,
      coverFile,
      onProgress: setProgress,
    });

    if (!result.ok) {
      setFormError(result.error.message);
      setPhase("idle");
      return;
    }

    router.replace("/library?uploaded=1");
    router.refresh();
  }

  return (
    <Card className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-busy={busy}>
        {formError ? (
          <p
            role="alert"
            className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-3 py-2 text-sm"
          >
            {formError}
          </p>
        ) : null}

        <Input
          label="عنوان الأغنية"
          name="title"
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setTitleError(null);
          }}
          maxLength={120}
          placeholder="مثال: ليلة هادئة"
          disabled={busy}
          required
          error={titleError}
          hint="حتى 120 حرفاً."
        />

        <Input
          label="الفنان (اختياري)"
          name="artist"
          type="text"
          value={artist}
          onChange={(event) => setArtist(event.target.value)}
          placeholder="مثال: ليلى"
          disabled={busy}
        />

        <div className="space-y-2">
          <Input
            label="ملف الصوت"
            name="audio"
            type="file"
            accept={AUDIO_ACCEPT}
            onChange={(event) => handleAudioChange(event.target.files?.[0] ?? null)}
            disabled={busy}
            required
            error={audioError}
            hint="MP3 أو M4A أو WAV أو OGG — بحد أقصى 100 ميجابايت."
          />
          {audioFile ? (
            <p className="text-muted text-xs" dir="auto">
              الملف المحدد: {audioFile.name}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:items-start">
          <div className="bg-surface-2 border-border grid aspect-square w-40 place-items-center overflow-hidden rounded-xl border">
            {coverPreview ? (
              // Local object URL preview; no remote image optimization needed.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview}
                alt="معاينة صورة الغلاف"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-muted flex flex-col items-center gap-2 text-xs">
                <ImageIcon className="size-8" />
                <span>لا توجد معاينة</span>
              </div>
            )}
          </div>

          <Input
            label="صورة الغلاف (اختياري)"
            name="cover"
            type="file"
            accept={COVER_ACCEPT}
            onChange={(event) => handleCoverChange(event.target.files?.[0] ?? null)}
            disabled={busy}
            error={coverError}
            hint="JPG أو PNG أو WebP — بحد أقصى 5 ميجابايت."
          />
        </div>

        {progress ? (
          <div className="border-border bg-surface-2/40 space-y-3 rounded-xl border p-3">
            <ProgressBar label="ملف الصوت" value={progress.audio} />
            {progress.cover !== null ? (
              <ProgressBar label="صورة الغلاف" value={progress.cover} />
            ) : null}
            <p className="text-muted text-xs">لا تغلق الصفحة حتى يكتمل الرفع.</p>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link
            href="/library"
            className="text-muted hover:text-foreground inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors"
          >
            إلغاء
          </Link>
          <Button type="submit" loading={busy} disabled={busy} className="gap-2 sm:min-w-40">
            {busy ? "جارٍ رفع الأغنية..." : "رفع الأغنية"}
            {!busy ? <UploadIcon className="size-4" /> : null}
          </Button>
        </div>
      </form>
    </Card>
  );
}
