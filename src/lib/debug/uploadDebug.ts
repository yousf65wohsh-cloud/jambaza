// TEMP-DEBUG: temporary upload diagnostics. Remove this whole file together
// with NEXT_PUBLIC_UPLOAD_DEBUG and every TEMP-DEBUG comment when debugging ends.

import type {
  ApiResponse,
  UploadDebugErrorInfo,
  UploadDebugInfo,
  UploadDebugStep,
} from "@/types/api";

/**
 * TEMP-DEBUG: true only when the public debug flag is exactly "true".
 * NEXT_PUBLIC_* values are inlined by Next.js on both server and client.
 */
export function isUploadDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_UPLOAD_DEBUG === "true";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function primitivesOnly(value: unknown): string | number | boolean | undefined {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? value
    : undefined;
}

/**
 * TEMP-DEBUG: returns a plain object containing only whitelisted error fields.
 * Never spreads or returns the original object. `details` is only included when
 * it is a primitive, and `cause` is surfaced under `error` for wrapped Supabase
 * errors. Tokens, keys, URLs, and unknown fields are always dropped.
 */
export function describeError(error: unknown, depth = 0): UploadDebugErrorInfo {
  if (error === null || error === undefined) {
    return {};
  }

  if (
    typeof error === "string" ||
    typeof error === "number" ||
    typeof error === "boolean"
  ) {
    return { message: String(error) };
  }

  const source = asRecord(error);
  if (!source) {
    return {};
  }

  const info: UploadDebugErrorInfo = {};

  if (typeof source.name === "string") info.name = source.name;
  if (typeof source.message === "string") info.message = source.message;
  if (typeof source.code === "string" || typeof source.code === "number") {
    info.code = source.code;
  }

  const details = primitivesOnly(source.details);
  if (details !== undefined) info.details = details;

  if (typeof source.hint === "string") info.hint = source.hint;
  if (typeof source.status === "number") info.status = source.status;
  if (typeof source.statusCode === "number") info.statusCode = source.statusCode;

  if (depth < 2) {
    const nested = source.error ?? source.cause;

    if (nested !== undefined && nested !== error) {
      const nestedInfo = describeError(nested, depth + 1);

      if (Object.keys(nestedInfo).length > 0) {
        info.error = nestedInfo;
      }
    }
  }

  return info;
}

/** TEMP-DEBUG: carries the upload step alongside the original thrown value. */
export class UploadStepError extends Error {
  constructor(
    readonly step: UploadDebugStep,
    readonly originalError: unknown,
  ) {
    super(`Upload step failed: ${step}`);
    this.name = "UploadStepError";
  }
}

/** TEMP-DEBUG: runs one upload step in its own try/catch and tags failures. */
export async function runUploadStep<T>(
  step: UploadDebugStep,
  action: () => Promise<T> | T,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new UploadStepError(step, error);
  }
}

/** TEMP-DEBUG: extracts the step and original error from a tagged failure. */
export function unwrapUploadStepError(error: unknown): {
  step: UploadDebugStep;
  error: unknown;
} {
  if (error instanceof UploadStepError) {
    return { step: error.step, error: error.originalError };
  }

  return { step: "validate", error };
}

/** TEMP-DEBUG: always logs safe fields, regardless of the public UI flag. */
export function logUploadError(step: UploadDebugStep, error: unknown): void {
  console.error("[upload-debug]", { step, ...describeError(error) });
}

/** TEMP-DEBUG: attaches debug info to a failure envelope only when enabled. */
export function withUploadDebug<T>(
  response: ApiResponse<T>,
  step: UploadDebugStep,
  error: unknown,
): ApiResponse<T> {
  if (!isUploadDebugEnabled() || response.ok) {
    return response;
  }

  return {
    ...response,
    error: {
      ...response.error,
      debug: { step, ...describeError(error) } satisfies UploadDebugInfo,
    },
  };
}
