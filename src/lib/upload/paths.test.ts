import { describe, expect, it } from "vitest";

import {
  buildAudioPath,
  buildCoverPath,
  buildFullStoragePath,
  parsePublicStoragePath,
} from "./paths";

const OWNER_ID = "8f14e45f-ea0a-4c3b-9f1e-93a3f6a2d9b1";
const TRACK_ID = "f1d2d2f4-6e5c-4b2a-8a0e-8a3f5e9c1b7d";

describe("buildAudioPath", () => {
  it("builds the object path {owner_id}/{track_id}.{ext} inside the audio bucket", () => {
    expect(buildAudioPath(OWNER_ID, TRACK_ID, "mp3")).toBe(
      `${OWNER_ID}/${TRACK_ID}.mp3`,
    );
  });

  it("normalizes a leading dot and casing", () => {
    expect(buildAudioPath(OWNER_ID, TRACK_ID, ".M4A")).toBe(
      `${OWNER_ID}/${TRACK_ID}.m4a`,
    );
  });

  it("rejects unsafe extensions", () => {
    expect(() => buildAudioPath(OWNER_ID, TRACK_ID, "../mp3")).toThrow();
  });
});

describe("buildCoverPath", () => {
  it("builds the object path {owner_id}/{track_id}.{ext} inside the covers bucket", () => {
    expect(buildCoverPath(OWNER_ID, TRACK_ID, "webp")).toBe(
      `${OWNER_ID}/${TRACK_ID}.webp`,
    );
  });
});

describe("buildFullStoragePath", () => {
  it("prepends the bucket name for display", () => {
    expect(buildFullStoragePath("audio", `${OWNER_ID}/${TRACK_ID}.mp3`)).toBe(
      `audio/${OWNER_ID}/${TRACK_ID}.mp3`,
    );
    expect(buildFullStoragePath("covers", `${OWNER_ID}/${TRACK_ID}.webp`)).toBe(
      `covers/${OWNER_ID}/${TRACK_ID}.webp`,
    );
  });
});

describe("parsePublicStoragePath", () => {
  it("extracts the object path from a public Supabase URL", () => {
    const url = `https://example.supabase.co/storage/v1/object/public/covers/${OWNER_ID}/${TRACK_ID}.jpg`;

    expect(parsePublicStoragePath(url, "covers")).toBe(`${OWNER_ID}/${TRACK_ID}.jpg`);
  });

  it("decodes URL-encoded path segments", () => {
    const url =
      "https://example.supabase.co/storage/v1/object/public/covers/folder%20name/cover%201.jpg";

    expect(parsePublicStoragePath(url, "covers")).toBe("folder name/cover 1.jpg");
  });

  it("returns null for a different bucket or an external URL", () => {
    expect(
      parsePublicStoragePath(
        `https://example.supabase.co/storage/v1/object/public/audio/${TRACK_ID}.mp3`,
        "covers",
      ),
    ).toBeNull();
    expect(parsePublicStoragePath("https://example.com/cover.jpg", "covers")).toBeNull();
    expect(parsePublicStoragePath("not a url", "covers")).toBeNull();
  });
});
