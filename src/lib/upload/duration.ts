"use client";

const DURATION_TIMEOUT_MS = 15_000;

/**
 * Reads an uploaded audio file's duration locally. Returns null when the
 * browser cannot read metadata; the upload can still continue in that case.
 */
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    let settled = false;
    let timeout: number | null = null;

    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;

      if (timeout !== null) {
        window.clearTimeout(timeout);
      }

      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    };
    audio.onerror = () => finish(null);

    timeout = window.setTimeout(() => finish(null), DURATION_TIMEOUT_MS);
    audio.src = objectUrl;
  });
}
