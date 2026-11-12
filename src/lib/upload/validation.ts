const MEGABYTE = 1024 * 1024;

export const MAX_AUDIO_BYTES = 100 * MEGABYTE;
export const MAX_COVER_BYTES = 5 * MEGABYTE;

export type UploadValidationCode = "EMPTY_FILE" | "UNSUPPORTED_TYPE" | "TOO_LARGE";

export interface UploadValidationFailure {
  ok: false;
  code: UploadValidationCode;
  message: string;
}

export interface AudioValidationSuccess {
  ok: true;
  kind: "audio";
  mimeType: string;
  extension: "mp3" | "m4a" | "wav" | "ogg";
}

export interface CoverValidationSuccess {
  ok: true;
  kind: "cover";
  mimeType: string;
  extension: "jpg" | "png" | "webp";
}

export type UploadValidationResult = UploadValidationFailure;
export type AudioValidationResult = AudioValidationSuccess | UploadValidationFailure;
export type CoverValidationResult = CoverValidationSuccess | UploadValidationFailure;

const AUDIO_TYPES: Record<string, AudioValidationSuccess["extension"]> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
};

const COVER_TYPES: Record<string, CoverValidationSuccess["extension"]> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function normalizeMimeType(type: string): string {
  return type.split(";")[0]?.trim().toLowerCase() ?? "";
}

function validateFile(file: File, maxBytes: number): UploadValidationFailure | null {
  if (!file || file.size <= 0) {
    return {
      ok: false,
      code: "EMPTY_FILE",
      message: "الملف فارغ. اختر ملفاً صالحاً.",
    };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      code: "TOO_LARGE",
      message:
        maxBytes === MAX_AUDIO_BYTES
          ? "حجم ملف الصوت يتجاوز 100 ميجابايت."
          : "حجم صورة الغلاف يتجاوز 5 ميجابايت.",
    };
  }

  return null;
}

export function validateAudioFile(file: File): AudioValidationResult {
  const baseError = validateFile(file, MAX_AUDIO_BYTES);
  if (baseError) return baseError;

  const mimeType = normalizeMimeType(file.type);
  const extension = AUDIO_TYPES[mimeType];

  if (!extension) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: "صيغة الملف غير مدعومة. استخدم MP3 أو M4A أو WAV أو OGG.",
    };
  }

  return { ok: true, kind: "audio", mimeType, extension };
}

export function validateCoverFile(file: File): CoverValidationResult {
  const baseError = validateFile(file, MAX_COVER_BYTES);
  if (baseError) return baseError;

  const mimeType = normalizeMimeType(file.type);
  const extension = COVER_TYPES[mimeType];

  if (!extension) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.",
    };
  }

  return { ok: true, kind: "cover", mimeType, extension };
}
