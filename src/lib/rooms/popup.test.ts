import { describe, expect, it } from "vitest";

import {
  listeningPlaybackLabel,
  listeningPopupTitle,
  listeningRoleLabel,
} from "./popup";

describe("listeningPopupTitle", () => {
  it("names the other participant", () => {
    expect(listeningPopupTitle("ليلى")).toBe("تستمع مع ليلى الآن");
  });

  it("falls back when the name is missing or blank", () => {
    expect(listeningPopupTitle(null)).toBe("تستمع مع صديقك الآن");
    expect(listeningPopupTitle("   ")).toBe("تستمع مع صديقك الآن");
  });
});

describe("listeningRoleLabel", () => {
  it("labels the host", () => {
    expect(listeningRoleLabel(true, "ليلى")).toBe("أنت المضيف");
  });

  it("names the host for members", () => {
    expect(listeningRoleLabel(false, "ليلى")).toBe("المضيف: ليلى");
  });

  it("falls back when the host name is missing", () => {
    expect(listeningRoleLabel(false, null)).toBe("المضيف");
  });
});

describe("listeningPlaybackLabel", () => {
  it("describes both playback states", () => {
    expect(listeningPlaybackLabel(true)).toBe("قيد التشغيل");
    expect(listeningPlaybackLabel(false)).toBe("متوقف");
  });
});
