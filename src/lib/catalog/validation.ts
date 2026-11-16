export const MAX_COMMENT_LENGTH = 500;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres uuid columns only accept this shape; reject early to keep errors friendly. */
export function isTrackId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Returns a valid 1..5 integer rating, or null when the value is invalid. */
export function normalizeRating(value: number): number | null {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return null;
  }

  return value;
}

/**
 * Trims a comment and enforces the database's 1..500 character rule.
 * An empty comment is allowed by the form, so callers can submit a rating only.
 */
export function normalizeComment(value: string): string | null {
  const body = value.trim();

  if (body.length > MAX_COMMENT_LENGTH) {
    return null;
  }

  return body;
}
