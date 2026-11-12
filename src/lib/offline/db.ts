import Dexie, { type EntityTable } from "dexie";

export interface OfflineTrack {
  trackId: string;
  blob: Blob;
  cachedAt: number;
}

export const OFFLINE_DB_NAME = "jambaza-offline";

export class JambazaDatabase extends Dexie {
  tracks!: EntityTable<OfflineTrack, "trackId">;

  constructor() {
    super(OFFLINE_DB_NAME);
    this.version(1).stores({
      // Primary key: trackId. Cached-at index lets us list newest first.
      tracks: "trackId, cachedAt",
    });
  }
}

let database: JambazaDatabase | null = null;

/**
 * Lazily creates the IndexedDB database. Keeping construction lazy avoids
 * touching `indexedDB` during server rendering.
 */
export function getOfflineDb(): JambazaDatabase {
  if (!database) {
    database = new JambazaDatabase();
  }
  return database;
}

/** Used by tests to get a clean database instance. */
export async function resetOfflineDb(): Promise<void> {
  await getOfflineDb().delete();
  database = null;
}
