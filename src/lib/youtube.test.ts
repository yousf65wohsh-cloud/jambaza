import { describe, expect, it } from "vitest";

import { isValidYouTubeVideoId, parseYouTubeVideoId } from "./youtube";

const VIDEO_ID = "dQw4w9WgXcQ";

describe("parseYouTubeVideoId", () => {
  it("accepts a standard watch URL", () => {
    expect(parseYouTubeVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}`)).toBe(
      VIDEO_ID,
    );
  });

  it("accepts a watch URL without a scheme and with extra parameters", () => {
    expect(
      parseYouTubeVideoId(`youtube.com/watch?v=${VIDEO_ID}&t=42s&list=abc`),
    ).toBe(VIDEO_ID);
  });

  it("accepts a youtu.be short link", () => {
    expect(parseYouTubeVideoId(`https://youtu.be/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("accepts an embed URL", () => {
    expect(parseYouTubeVideoId(`https://www.youtube.com/embed/${VIDEO_ID}`)).toBe(
      VIDEO_ID,
    );
  });

  it("accepts a shorts URL", () => {
    expect(parseYouTubeVideoId(`https://youtube.com/shorts/${VIDEO_ID}`)).toBe(
      VIDEO_ID,
    );
  });

  it("accepts a bare 11-character id with surrounding whitespace", () => {
    expect(parseYouTubeVideoId(`  ${VIDEO_ID}  `)).toBe(VIDEO_ID);
  });

  it("returns null for an empty or whitespace-only input", () => {
    expect(parseYouTubeVideoId("")).toBeNull();
    expect(parseYouTubeVideoId("   ")).toBeNull();
  });

  it("returns null for random text", () => {
    expect(parseYouTubeVideoId("not a youtube link")).toBeNull();
  });

  it("returns null for a wrong-length id", () => {
    expect(parseYouTubeVideoId("dQw4w9WgXc")).toBeNull();
    expect(parseYouTubeVideoId("dQw4w9WgXcQQ")).toBeNull();
    expect(parseYouTubeVideoId(`https://youtu.be/dQw4w9WgXc`)).toBeNull();
  });

  it("returns null for ids with invalid characters", () => {
    expect(parseYouTubeVideoId("dQw4w9WgXc!")).toBeNull();
  });

  it("returns null for a non-YouTube host", () => {
    expect(
      parseYouTubeVideoId(`https://vimeo.com/watch?v=${VIDEO_ID}`),
    ).toBeNull();
    expect(
      parseYouTubeVideoId(`https://example.com/watch?v=${VIDEO_ID}`),
    ).toBeNull();
  });

  it("returns null for an unsupported YouTube path", () => {
    expect(parseYouTubeVideoId(`https://youtube.com/channel/${VIDEO_ID}`)).toBeNull();
    expect(parseYouTubeVideoId("https://youtube.com/watch")).toBeNull();
  });
});

describe("isValidYouTubeVideoId", () => {
  it("matches only the 11-character id format", () => {
    expect(isValidYouTubeVideoId(VIDEO_ID)).toBe(true);
    expect(isValidYouTubeVideoId("short")).toBe(false);
    expect(isValidYouTubeVideoId(`${VIDEO_ID}!`)).toBe(false);
  });
});
