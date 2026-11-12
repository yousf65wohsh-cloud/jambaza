export const ROOM_DRIFT_THRESHOLD_SECONDS = 2;

export interface DriftInput {
  localSeconds: number;
  remoteSeconds: number;
  threshold?: number;
}

export interface DriftResult {
  /** remote − local, in seconds. */
  driftSeconds: number;
  shouldSeek: boolean;
  targetSeconds: number;
}

/**
 * Listening-room drift correction.
 *
 * The local player is only corrected when it is more than 2 seconds away from
 * the host's position. Small differences are left alone so playback does not
 * stutter every time a Realtime message arrives.
 */
export function checkDrift({
  localSeconds,
  remoteSeconds,
  threshold = ROOM_DRIFT_THRESHOLD_SECONDS,
}: DriftInput): DriftResult {
  if (!Number.isFinite(localSeconds) || !Number.isFinite(remoteSeconds)) {
    return { driftSeconds: 0, shouldSeek: false, targetSeconds: 0 };
  }

  const safeLocal = Math.max(0, localSeconds);
  const safeRemote = Math.max(0, remoteSeconds);
  const driftSeconds = safeRemote - safeLocal;

  return {
    driftSeconds,
    shouldSeek: Math.abs(driftSeconds) > threshold,
    targetSeconds: safeRemote,
  };
}
