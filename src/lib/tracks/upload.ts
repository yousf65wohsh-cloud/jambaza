"use client";

import { apiFail } from "@/lib/api/result";
// TEMP-DEBUG: temporary upload diagnostics. Remove with the debug feature.
import {
  logUploadError,
  runUploadStep,
  unwrapUploadStepError,
  withUploadDebug,
} from "@/lib/debug/uploadDebug";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { readAudioDuration } from "@/lib/upload/duration";
import { buildAudioPath, buildCoverPath } from "@/lib/upload/paths";
import {
  getPublicCoverUrl,
  removeStorageFilesBestEffort,
  uploadFileToStorage,
} from "@/lib/upload/storage";
import { validateAudioFile, validateCoverFile } from "@/lib/upload/validation";
import type { ApiResponse } from "@/types/api";
import type { Track } from "@/types/track";

import { createTrack } from "./data";

export interface UploadProgress {
  audio: number;
  cover: number | null;
}

export interface UploadTrackInput {
  title: string;
  artist: string | null;
  audioFile: File;
  coverFile: File | null;
  onProgress?: (progress: UploadProgress) => void;
}

const UPLOAD_FAILED_MESSAGE = "تعذّر رفع الأغنية. حاول مرة أخرى.";

/**
 * Runs the upload in the required order:
 * audio -> cover -> tracks row. Any files uploaded before a failure are
 * removed so a failed insert cannot leave an orphan row.
 */
export async function uploadTrack(input: UploadTrackInput): Promise<ApiResponse<Track>> {
  let uploadedAudioPath: string | null = null;
  let uploadedCoverPath: string | null = null;
  let audioProgress = 0;
  let coverProgress: number | null = input.coverFile ? 0 : null;

  const report = () => {
    input.onProgress?.({ audio: audioProgress, cover: coverProgress });
  };

  const cleanup = async () => {
    const files: Array<{ bucket: "audio" | "covers"; path: string }> = [];

    if (uploadedAudioPath) {
      files.push({ bucket: "audio", path: uploadedAudioPath });
    }
    if (uploadedCoverPath) {
      files.push({ bucket: "covers", path: uploadedCoverPath });
    }

    await removeStorageFilesBestEffort(files);
  };

  // TEMP-DEBUG: rollback is tracked as its own step so failures are visible.
  const rollbackUploads = async () => {
    try {
      await runUploadStep("rollback", () => cleanup());
    } catch (thrown) {
      const { step, error } = unwrapUploadStepError(thrown);
      logUploadError(step, error);
    }
  };

  try {
    // TEMP-DEBUG: each step runs through runUploadStep, which tags failures.
    const prepared = await runUploadStep("validate", async () => {
      const title = input.title.trim();
      if (!title) {
        throw new AppError("BAD_REQUEST", "عنوان الأغنية مطلوب.");
      }
      if (title.length > 120) {
        throw new AppError("BAD_REQUEST", "عنوان الأغنية يجب ألا يتجاوز 120 حرفاً.");
      }

      const audioValidation = validateAudioFile(input.audioFile);
      if (!audioValidation.ok) {
        throw new AppError("BAD_REQUEST", audioValidation.message);
      }

      const coverValidation = input.coverFile ? validateCoverFile(input.coverFile) : null;
      if (coverValidation && !coverValidation.ok) {
        throw new AppError("BAD_REQUEST", coverValidation.message);
      }

      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new AppError("UNAUTHORIZED", "يجب تسجيل الدخول لرفع الأغاني.", {
          cause: userError,
        });
      }

      const trackId = crypto.randomUUID();
      const audioPath = buildAudioPath(user.id, trackId, audioValidation.extension);
      const coverPath =
        input.coverFile && coverValidation?.ok
          ? buildCoverPath(user.id, trackId, coverValidation.extension)
          : null;

      return { title, trackId, audioPath, coverPath };
    });

    const { title, trackId, audioPath, coverPath } = prepared;

    const duration = await runUploadStep("read-duration", () =>
      readAudioDuration(input.audioFile),
    );

    report();

    await runUploadStep("upload-audio", () =>
      uploadFileToStorage({
        bucket: "audio",
        path: audioPath,
        file: input.audioFile,
        onProgress: (percent) => {
          audioProgress = percent;
          report();
        },
      }),
    );
    uploadedAudioPath = audioPath;
    audioProgress = 100;
    report();

    if (input.coverFile && coverPath) {
      await runUploadStep("upload-cover", () =>
        uploadFileToStorage({
          bucket: "covers",
          path: coverPath,
          file: input.coverFile as File,
          onProgress: (percent) => {
            coverProgress = percent;
            report();
          },
        }),
      );
      uploadedCoverPath = coverPath;
      coverProgress = 100;
      report();
    }

    const coverUrl = uploadedCoverPath ? getPublicCoverUrl(uploadedCoverPath) : null;

    const result = await runUploadStep("insert-track", () =>
      createTrack({
        id: trackId,
        title,
        artist: input.artist,
        coverUrl,
        audioPath,
        durationSeconds:
          duration === null || !Number.isFinite(duration)
            ? null
            : Math.max(0, Math.round(duration)),
      }),
    );

    if (!result.ok) {
      // TEMP-DEBUG: log and return the failing step without changing the message.
      logUploadError("insert-track", result.error);
      await rollbackUploads();
      return withUploadDebug(result, "insert-track", result.error);
    }

    return result;
  } catch (thrown) {
    // TEMP-DEBUG: log the real error with its step, then keep the Arabic message.
    const { step, error } = unwrapUploadStepError(thrown);
    logUploadError(step, error);
    await rollbackUploads();
    return withUploadDebug(apiFail<Track>(error, UPLOAD_FAILED_MESSAGE), step, error);
  }
}
