export const MIN_PASSWORD_LENGTH = 8;
export const MAX_DISPLAY_NAME_LENGTH = 60;

export type AccountValidationResult =
  | { ok: true }
  | { ok: false; message: string };

/** Trims and collapses whitespace; an empty result means "no display name". */
export function normalizeDisplayName(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length === 0 ? null : normalized;
}

export function validateDisplayName(value: string): AccountValidationResult {
  const normalized = normalizeDisplayName(value);

  if (normalized && normalized.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      ok: false,
      message: `الاسم المعروض يجب ألا يتجاوز ${MAX_DISPLAY_NAME_LENGTH} حرفاً.`,
    };
  }

  return { ok: true };
}

export function validateNewPassword(password: string): AccountValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `كلمة المرور يجب أن تتكون من ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`,
    };
  }

  return { ok: true };
}
