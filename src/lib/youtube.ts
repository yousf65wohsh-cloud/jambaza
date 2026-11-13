export interface YouTubePlayerEvent {
  target: YouTubePlayerInstance;
  data?: number;
}

export interface YouTubePlayerOptions {
  videoId: string;
  host?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
    onStateChange?: (event: YouTubePlayerEvent) => void;
    onError?: (event: YouTubePlayerEvent) => void;
  };
}

export interface YouTubePlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  loadVideoById: (videoId: string | { videoId: string; startSeconds?: number }) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setVolume: (volume: number) => void;
  destroy: () => void;
}

export interface YouTubeApi {
  Player: new (element: HTMLElement | string, options: YouTubePlayerOptions) => YouTubePlayerInstance;
}

export const YOUTUBE_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeApi> | null = null;

/**
 * Loads the official YouTube IFrame Player API exactly once.
 * We only ever embed and control the official player — nothing is downloaded.
 */
export function loadYouTubeIframeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("مشغل يوتيوب متاح في المتصفح فقط."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      apiPromise = null;
      reject(new Error("انتهت مهلة تحميل مشغل يوتيوب."));
    }, 15_000);

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        apiPromise = null;
        reject(new Error("تعذّر تهيئة مشغل يوتيوب."));
      }
    };

    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        apiPromise = null;
        reject(new Error("تعذّر تحميل مشغل يوتيوب. تحقق من اتصالك بالإنترنت."));
      };
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

/** Exactly the 11-character id format used by YouTube videos. */
export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const YOUTUBE_SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);

export function isValidYouTubeVideoId(value: string): boolean {
  return YOUTUBE_VIDEO_ID_PATTERN.test(value);
}

function parsePathId(segment: string | undefined): string | null {
  return segment && isValidYouTubeVideoId(segment) ? segment : null;
}

/**
 * Extracts only the 11-character video id from a pasted YouTube link.
 *
 * Accepted: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID,
 * youtube.com/shorts/ID, and a bare ID. Everything else returns null. Full
 * URLs are never stored; callers persist only the returned id.
 */
export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();

  if (trimmed === "") {
    return null;
  }

  if (isValidYouTubeVideoId(trimmed)) {
    return trimmed;
  }

  let url: URL;

  try {
    const hasHttpScheme = /^https?:\/\//i.test(trimmed);
    url = new URL(hasHttpScheme ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  if (YOUTUBE_SHORT_HOSTS.has(host)) {
    return segments.length === 1 ? parsePathId(segments[0]) : null;
  }

  if (!YOUTUBE_HOSTS.has(host)) {
    return null;
  }

  if (segments.length === 1 && segments[0] === "watch") {
    return parsePathId(url.searchParams.get("v") ?? undefined);
  }

  if (
    segments.length === 2 &&
    (segments[0] === "embed" || segments[0] === "shorts")
  ) {
    return parsePathId(segments[1]);
  }

  return null;
}
