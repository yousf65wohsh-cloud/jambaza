/**
 * Trims a free-text search query and treats blank input as "no query".
 *
 * Returns `null` for an empty or whitespace-only string so callers can tell
 * "nothing typed" apart from an actual search.
 */
export function normalizeQuery(input: string): string | null {
  const trimmed = input.trim();

  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Pure query normalization for the catalog search.
 *
 * PostgREST `or` filters separate conditions with commas and group them with
 * parentheses, so those characters cannot be passed through from a search box.
 * They are replaced with spaces instead of being dropped, which keeps the
 * user's words separated.
 */
export function toCatalogSearchPattern(query: string): string | null {
  const cleaned = query
    .trim()
    .replace(/[,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length === 0 ? null : cleaned;
}
