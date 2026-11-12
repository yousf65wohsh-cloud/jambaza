export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "OFFLINE"
  | "INTERNAL";

// TEMP-DEBUG: temporary upload diagnostics. Remove with the debug feature.
export type UploadDebugStep =
  | "validate"
  | "read-duration"
  | "upload-audio"
  | "upload-cover"
  | "insert-track"
  | "rollback";

// TEMP-DEBUG: whitelisted error fields only; never raw error objects.
export interface UploadDebugErrorInfo {
  name?: string;
  message?: string;
  code?: string | number;
  details?: string | number | boolean;
  hint?: string;
  status?: number;
  statusCode?: number;
  error?: UploadDebugErrorInfo;
}

// TEMP-DEBUG
export interface UploadDebugInfo extends UploadDebugErrorInfo {
  step: UploadDebugStep;
}

export interface ApiErrorPayload {
  code: ApiErrorCode | string;
  message: string;
  details?: unknown;
  // TEMP-DEBUG: only populated while NEXT_PUBLIC_UPLOAD_DEBUG is "true".
  debug?: UploadDebugInfo;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiErrorPayload };
