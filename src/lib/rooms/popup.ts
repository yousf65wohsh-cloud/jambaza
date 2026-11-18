/** Text helpers for the floating shared-listening window. */

/** "تستمع مع {name} الآن", or a neutral fallback when no name is known. */
export function listeningPopupTitle(peerName: string | null | undefined): string {
  const name = peerName?.trim();

  return name ? `تستمع مع ${name} الآن` : "تستمع مع صديقك الآن";
}

/** The host sees "أنت المضيف"; members see who is hosting. */
export function listeningRoleLabel(
  isHost: boolean,
  hostName: string | null | undefined,
): string {
  if (isHost) {
    return "أنت المضيف";
  }

  const name = hostName?.trim();

  return name ? `المضيف: ${name}` : "المضيف";
}

/** Short playback state shown in the popup. */
export function listeningPlaybackLabel(isPlaying: boolean): string {
  return isPlaying ? "قيد التشغيل" : "متوقف";
}
