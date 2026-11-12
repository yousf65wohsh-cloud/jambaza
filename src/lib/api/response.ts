import { NextResponse } from "next/server";

import { toAppError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";

/** Success envelope: { ok: true, data }. */
export function apiSuccess<T>(data: T, init?: ResponseInit): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

/** Failure envelope: { ok: false, error: { code, message, details? } }. */
export function apiError(
  error: unknown,
  fallbackMessage = "حدث خطأ غير متوقع.",
): NextResponse<ApiResponse<never>> {
  const appError = toAppError(error, fallbackMessage);

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details === undefined ? {} : { details: appError.details }),
      },
    },
    { status: appError.status },
  );
}
