"use client";

import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type StorageBucket = "audio" | "covers";

export interface UploadToStorageOptions {
  bucket: StorageBucket;
  path: string;
  file: File;
  onProgress?: (percent: number) => void;
}

function encodeStoragePath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function storageUploadError(status: number): AppError {
  if (status === 401 || status === 403) {
    return new AppError(
      "UNAUTHORIZED",
      "انتهت صلاحية الجلسة أو لا تملك صلاحية الرفع. سجّل الدخول مجدداً.",
    );
  }

  if (status === 409) {
    return new AppError("CONFLICT", "يوجد ملف بنفس الاسم بالفعل. حاول مجدداً.");
  }

  if (status === 413) {
    return new AppError("BAD_REQUEST", "حجم الملف أكبر من الحد المسموح في التخزين.");
  }

  return new AppError("INTERNAL", "تعذّر رفع الملف إلى التخزين. حاول مرة أخرى.");
}

/**
 * Uploads a File directly from the browser to Supabase Storage using XHR.
 * The file body never passes through a Next.js route or server action.
 */
export async function uploadFileToStorage({
  bucket,
  path,
  file,
  onProgress,
}: UploadToStorageOptions): Promise<void> {
  const {
    data: { session },
    error: sessionError,
  } = await createClient().auth.getSession();

  if (sessionError || !session) {
    throw new AppError("UNAUTHORIZED", "يجب تسجيل الدخول لرفع الملفات.");
  }

  const { url, anonKey } = getSupabaseEnv();
  const endpoint = `${url.replace(/\/+$/, "")}/storage/v1/object/${bucket}/${encodeStoragePath(path)}`;

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    let settled = false;

    const fail = (error: AppError) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    request.open("POST", endpoint, true);
    request.timeout = 30 * 60 * 1000;
    request.setRequestHeader("authorization", `Bearer ${session.access_token}`);
    request.setRequestHeader("apikey", anonKey);
    request.setRequestHeader("content-type", file.type);
    request.setRequestHeader("cache-control", "3600");
    request.setRequestHeader("x-upsert", "false");

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;

      const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
      onProgress?.(percent);
    };

    request.onload = () => {
      if (settled) return;

      if (request.status >= 200 && request.status < 300) {
        settled = true;
        onProgress?.(100);
        resolve();
        return;
      }

      fail(storageUploadError(request.status));
    };

    request.onerror = () => {
      fail(new AppError("OFFLINE", "تعذّر الاتصال بالتخزين. تحقق من اتصالك بالإنترنت."));
    };

    request.ontimeout = () => {
      fail(new AppError("OFFLINE", "استغرق رفع الملف وقتاً طويلاً. حاول مرة أخرى."));
    };

    request.onabort = () => {
      fail(new AppError("INTERNAL", "تم إلغاء رفع الملف."));
    };

    onProgress?.(0);
    request.send(file);
  });
}

/** Builds the public URL stored in `tracks.cover_url`. */
export function getPublicCoverUrl(path: string): string {
  return createClient().storage.from("covers").getPublicUrl(path).data.publicUrl;
}

/** Best-effort cleanup used after a failed track insert. */
export async function removeStorageFilesBestEffort(
  files: Array<{ bucket: StorageBucket; path: string }>,
): Promise<void> {
  if (files.length === 0) return;

  try {
    const supabase = createClient();
    await Promise.allSettled(
      files.map(({ bucket, path }) => supabase.storage.from(bucket).remove([path])),
    );
  } catch {
    // The track row was not created; leftover files can be cleaned manually.
  }
}
