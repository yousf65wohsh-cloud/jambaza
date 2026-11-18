import type { ListeningRole } from "./membership";

/** Text helpers for the floating shared-listening window. */

/** "تستمع مع {name} الآن", or a neutral fallback when no name is known. */
export function listeningPopupTitle(peerName: string | null | undefined): string {
  const name = peerName?.trim();

  return name ? `تستمع مع ${name} الآن` : "غرفة استماع مشتركة";
}

/** The host sees "أنت المضيف"; members see who is hosting; no role, no badge. */
export function listeningRoleLabel(
  role: ListeningRole,
  hostName: string | null | undefined,
): string | null {
  if (role === "host") {
    return "أنت المضيف";
  }

  if (role === "member") {
    const name = hostName?.trim();

    return name ? `المضيف: ${name}` : "المضيف";
  }

  return null;
}

/** Short playback state shown in the popup. */
export function listeningPlaybackLabel(isPlaying: boolean): string {
  return isPlaying ? "قيد التشغيل" : "متوقف";
}
