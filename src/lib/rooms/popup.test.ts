import { describe, expect, it } from "vitest";

import { listeningPlaybackLabel, listeningPopupTitle, listeningRoleLabel } from "./popup";

describe("listeningPopupTitle", () => {
  it("names the other participant", () => {
    expect(listeningPopupTitle("ليلى")).toBe("تستمع مع ليلى الآن");
  });

  it("falls back when the name is missing or blank", () => {
    expect(listeningPopupTitle(null)).toBe("غرفة استماع مشتركة");
    expect(listeningPopupTitle("   ")).toBe("غرفة استماع مشتركة");
  });
});

describe("listeningRoleLabel", () => {
  it("labels the host", () => {
    expect(listeningRoleLabel("host", "ليلى")).toBe("أنت المضيف");
  });

  it("names the host for members", () => {
    expect(listeningRoleLabel("member", "ليلى")).toBe("المضيف: ليلى");
  });

  it("falls back when the host name is missing", () => {
    expect(listeningRoleLabel("member", null)).toBe("المضيف");
  });

  it("has no label for someone with no role", () => {
    expect(listeningRoleLabel("none", "ليلى")).toBeNull();
  });
});

describe("listeningPlaybackLabel", () => {
  it("describes both playback states", () => {
    expect(listeningPlaybackLabel(true)).toBe("قيد التشغيل");
    expect(listeningPlaybackLabel(false)).toBe("متوقف");
  });
});
