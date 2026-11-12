import { describe, expect, it } from "vitest";

import {
  MAX_AUDIO_BYTES,
  MAX_COVER_BYTES,
  validateAudioFile,
  validateCoverFile,
} from "./validation";

function fakeFile(name: string, type: string, size: number): File {
  return { name, type, size } as File;
}

describe("validateAudioFile", () => {
  it.each([
    ["song.mp3", "audio/mpeg", "mp3"],
    ["song.m4a", "audio/mp4", "m4a"],
    ["song.m4a", "audio/x-m4a", "m4a"],
    ["song.wav", "audio/wav", "wav"],
    ["song.ogg", "audio/ogg", "ogg"],
  ])("accepts %s as %s", (name, type, extension) => {
    expect(validateAudioFile(fakeFile(name, type, 1024))).toEqual({
      ok: true,
      kind: "audio",
      mimeType: type,
      extension,
    });
  });

  it("normalizes MIME types with parameters and casing", () => {
    expect(validateAudioFile(fakeFile("song.mp3", "Audio/MPEG; codecs=mp3", 1024))).toEqual({
      ok: true,
      kind: "audio",
      mimeType: "audio/mpeg",
      extension: "mp3",
    });
  });

  it("accepts a file exactly at the 100 MB limit", () => {
    expect(validateAudioFile(fakeFile("song.mp3", "audio/mpeg", MAX_AUDIO_BYTES)).ok).toBe(true);
  });

  it("rejects a file over 100 MB", () => {
    expect(validateAudioFile(fakeFile("song.mp3", "audio/mpeg", MAX_AUDIO_BYTES + 1))).toEqual({
      ok: false,
      code: "TOO_LARGE",
      message: "حجم ملف الصوت يتجاوز 100 ميجابايت.",
    });
  });

  it("rejects unsupported audio types", () => {
    expect(validateAudioFile(fakeFile("song.flac", "audio/flac", 1024))).toEqual({
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: "صيغة الملف غير مدعومة. استخدم MP3 أو M4A أو WAV أو OGG.",
    });
  });

  it("rejects empty files", () => {
    expect(validateAudioFile(fakeFile("empty.mp3", "audio/mpeg", 0))).toMatchObject({
      ok: false,
      code: "EMPTY_FILE",
    });
  });
});

describe("validateCoverFile", () => {
  it.each([
    ["cover.jpg", "image/jpeg", "jpg"],
    ["cover.png", "image/png", "png"],
    ["cover.webp", "image/webp", "webp"],
  ])("accepts %s as %s", (name, type, extension) => {
    expect(validateCoverFile(fakeFile(name, type, 1024))).toEqual({
      ok: true,
      kind: "cover",
      mimeType: type,
      extension,
    });
  });

  it("accepts an image exactly at the 5 MB limit", () => {
    expect(validateCoverFile(fakeFile("cover.png", "image/png", MAX_COVER_BYTES)).ok).toBe(true);
  });

  it("rejects an image over 5 MB", () => {
    expect(validateCoverFile(fakeFile("cover.png", "image/png", MAX_COVER_BYTES + 1))).toEqual({
      ok: false,
      code: "TOO_LARGE",
      message: "حجم صورة الغلاف يتجاوز 5 ميجابايت.",
    });
  });

  it("rejects unsupported image types", () => {
    expect(validateCoverFile(fakeFile("cover.gif", "image/gif", 1024))).toEqual({
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.",
    });
  });
});
