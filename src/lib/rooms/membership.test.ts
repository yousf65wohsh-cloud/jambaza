import { describe, expect, it } from "vitest";

import { canInvite, isHost } from "./membership";

const HOST_ID = "8f14e45f-ea0a-4c3b-9f1e-93a3f6a2d9b1";
const MEMBER_ID = "f1d2d2f4-6e5c-4b2a-8a0e-8a3f5e9c1b7d";

const room = { hostId: HOST_ID };

describe("isHost", () => {
  it("is true for the room host", () => {
    expect(isHost(room, HOST_ID)).toBe(true);
  });

  it("is false for a regular member", () => {
    expect(isHost(room, MEMBER_ID)).toBe(false);
  });

  it("is false when the room or the user id is missing", () => {
    expect(isHost(null, HOST_ID)).toBe(false);
    expect(isHost(undefined, HOST_ID)).toBe(false);
    expect(isHost(room, null)).toBe(false);
    expect(isHost(room, undefined)).toBe(false);
    expect(isHost(room, "")).toBe(false);
  });
});

describe("canInvite", () => {
  it("allows only the host to invite", () => {
    expect(canInvite(room, HOST_ID)).toBe(true);
    expect(canInvite(room, MEMBER_ID)).toBe(false);
  });

  it("is false without a loaded room or a signed-in user", () => {
    expect(canInvite(null, HOST_ID)).toBe(false);
    expect(canInvite(room, null)).toBe(false);
  });
});
