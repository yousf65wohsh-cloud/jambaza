import { toAppError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";

/** Client-safe success envelope matching `lib/api/response.ts`. */
export function apiOk<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

/** Client-safe failure envelope matching `lib/api/response.ts`. */
export function apiFail<T = never>(
  error: unknown,
  fallbackMessage = "حدث خطأ غير متوقع.",
): ApiResponse<T> {
  const appError = toAppError(error, fallbackMessage);

  return {
    ok: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details === undefined ? {} : { details: appError.details }),
    },
  };
}
