import type { ApiErrorCode } from "@/types/api";

const DEFAULT_STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  OFFLINE: 503,
  INTERNAL: 500,
};

export interface AppErrorOptions {
  status?: number;
  details?: unknown;
  cause?: unknown;
}

/**
 * The app's typed error. Carries a stable code for clients and an HTTP status
 * for route handlers. Messages are user-facing and should be in Arabic.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code] ?? 500;
    this.details = options.details;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/**
 * Normalizes unknown thrown values into an AppError.
 * Internal error messages are not exposed by default; they stay in `cause`.
 */
export function toAppError(error: unknown, fallbackMessage = "حدث خطأ غير متوقع."): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError("INTERNAL", fallbackMessage, { cause: error });
  }

  return new AppError("INTERNAL", fallbackMessage, { details: error });
}
