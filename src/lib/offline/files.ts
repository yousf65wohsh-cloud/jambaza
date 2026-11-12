import { getOfflineDb, type OfflineTrack } from "./db";

/**
 * Offline storage is only ever used for audio the user uploaded themselves.
 * Nothing here (or anywhere else) downloads media from external platforms.
 */
export async function saveForOffline(trackId: string, blob: Blob): Promise<void> {
  await getOfflineDb().tracks.put({
    trackId,
    blob,
    cachedAt: Date.now(),
  });
}

export async function getOfflineBlob(trackId: string): Promise<Blob | undefined> {
  const row = await getOfflineDb().tracks.get(trackId);
  return row?.blob;
}

export async function removeOffline(trackId: string): Promise<void> {
  await getOfflineDb().tracks.delete(trackId);
}

export async function listOffline(): Promise<OfflineTrack[]> {
  return getOfflineDb().tracks.orderBy("cachedAt").reverse().toArray();
}

export async function isAvailableOffline(trackId: string): Promise<boolean> {
  return (await getOfflineDb().tracks.where("trackId").equals(trackId).count()) > 0;
}
