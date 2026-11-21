import { describe, expect, it } from "vitest";

import type { Track } from "@/types/track";

import { buildPickerTracks } from "./picker";

function makeTrack(overrides: Partial<Track> & Pick<Track, "id">): Track {
  return {
    id: overrides.id,
    ownerId: overrides.ownerId ?? "owner-1",
    title: overrides.title ?? `Track ${overrides.id}`,
    artist: "artist" in overrides ? overrides.artist! : null,
    coverUrl: "coverUrl" in overrides ? overrides.coverUrl! : null,
    audioPath: "audioPath" in overrides ? overrides.audioPath! : "audio/path.mp3",
    durationSeconds: "durationSeconds" in overrides ? overrides.durationSeconds! : 120,
    sourceType: overrides.sourceType ?? "upload",
    description: "description" in overrides ? overrides.description! : null,
    credits: "credits" in overrides ? overrides.credits! : null,
    releaseDate: "releaseDate" in overrides ? overrides.releaseDate! : null,
    isPublished: overrides.isPublished ?? false,
  };
}

describe("buildPickerTracks", () => {
  it("removes duplicates by track id", () => {
    const published = [makeTrack({ id: "t1", isPublished: true })];
    const playlistTracks = [makeTrack({ id: "t1", isPublished: true }), makeTrack({ id: "t2" })];

    const result = buildPickerTracks(published, playlistTracks);

    expect(result.map((track) => track.id)).toEqual(["t1", "t2"]);
  });

  it("handles empty playlists", () => {
    const published = [makeTrack({ id: "t1", isPublished: true })];

    const result = buildPickerTracks(published, []);

    expect(result.map((track) => track.id)).toEqual(["t1"]);
  });

  it("filters out tracks missing audio_path", () => {
    const published = [
      makeTrack({ id: "t1", isPublished: true, audioPath: null }),
      makeTrack({ id: "t2", isPublished: true, audioPath: "audio/t2.mp3" }),
    ];
    const playlistTracks = [makeTrack({ id: "t3", audioPath: null })];

    const result = buildPickerTracks(published, playlistTracks);

    expect(result.map((track) => track.id)).toEqual(["t2"]);
  });

  it("preserves order with published tracks first then playlist tracks", () => {
    const published = [
      makeTrack({ id: "p1", isPublished: true }),
      makeTrack({ id: "p2", isPublished: true }),
    ];
    const playlistTracks = [makeTrack({ id: "l1" }), makeTrack({ id: "l2" })];

    const result = buildPickerTracks(published, playlistTracks);

    expect(result.map((track) => track.id)).toEqual(["p1", "p2", "l1", "l2"]);
  });

  it("keeps a published track from another owner", () => {
    const published = [
      makeTrack({ id: "other", ownerId: "other-owner", isPublished: true, audioPath: "a.mp3" }),
    ];

    const result = buildPickerTracks(published, []);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "other", ownerId: "other-owner", isPublished: true });
  });
});
