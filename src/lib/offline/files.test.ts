import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { resetOfflineDb } from "./db";
import {
  getOfflineBlob,
  isAvailableOffline,
  listOffline,
  removeOffline,
  saveForOffline,
} from "./files";

function audioBlob(text: string): Blob {
  return new Blob([text], { type: "audio/mpeg" });
}

describe("offline upload storage", () => {
  beforeEach(async () => {
    await resetOfflineDb();
  });

  afterAll(async () => {
    await resetOfflineDb();
  });

  it("saves a track blob and reads it back", async () => {
    await saveForOffline("track-1", audioBlob("first track"));

    const blob = await getOfflineBlob("track-1");

    expect(blob).toBeInstanceOf(Blob);
    expect(await blob?.text()).toBe("first track");
    expect(await isAvailableOffline("track-1")).toBe(true);
  });

  it("returns undefined for a track that is not cached", async () => {
    expect(await getOfflineBlob("missing")).toBeUndefined();
    expect(await isAvailableOffline("missing")).toBe(false);
  });

  it("overwrites an existing cached track", async () => {
    await saveForOffline("track-1", audioBlob("old"));
    await saveForOffline("track-1", audioBlob("new"));

    const blob = await getOfflineBlob("track-1");
    expect(await blob?.text()).toBe("new");
    expect(await listOffline()).toHaveLength(1);
  });

  it("lists cached tracks", async () => {
    await saveForOffline("track-1", audioBlob("one"));
    await saveForOffline("track-2", audioBlob("two"));

    const tracks = await listOffline();

    expect(tracks).toHaveLength(2);
    expect(new Set(tracks.map((track) => track.trackId))).toEqual(new Set(["track-1", "track-2"]));
    expect(tracks.every((track) => typeof track.cachedAt === "number")).toBe(true);
  });

  it("removes a cached track", async () => {
    await saveForOffline("track-1", audioBlob("one"));
    await removeOffline("track-1");

    expect(await getOfflineBlob("track-1")).toBeUndefined();
    expect(await listOffline()).toHaveLength(0);
  });
});
