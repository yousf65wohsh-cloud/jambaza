export type AudioExtension = "mp3" | "m4a" | "wav" | "ogg";
export type CoverExtension = "jpg" | "png" | "webp";

function normalizeExtension(extension: string): string {
  const normalized = extension.replace(/^\.+/, "").trim().toLowerCase();

  if (!/^[a-z0-9]+$/.test(normalized)) {
    throw new Error("Invalid file extension.");
  }

  return normalized;
}

/** audio/{owner_id}/{track_id}.{ext} */
export function buildAudioPath(
  ownerId: string,
  trackId: string,
  extension: AudioExtension | string,
): string {
  return `audio/${ownerId}/${trackId}.${normalizeExtension(extension)}`;
}

/** covers/{owner_id}/{track_id}.{ext} */
export function buildCoverPath(
  ownerId: string,
  trackId: string,
  extension: CoverExtension | string,
): string {
  return `covers/${ownerId}/${trackId}.${normalizeExtension(extension)}`;
}

/**
 * Extracts an object path from a Supabase public storage URL.
 * Returns null for external or unrecognized URLs.
 */
export function parsePublicStoragePath(publicUrl: string, bucket: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    const path = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    return path || null;
  } catch {
    return null;
  }
}
