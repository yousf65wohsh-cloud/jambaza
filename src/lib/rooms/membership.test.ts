import { describe, expect, it } from "vitest";

import { canHostLeave, canInvite, isHost, listeningRole } from "./membership";

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

describe("listeningRole", () => {
  it("makes the requester who pressed «استمع معه» the host", () => {
    expect(listeningRole({ hostId: HOST_ID, viewerId: HOST_ID, isMember: true })).toBe("host");
  });

  it("makes the invited friend a member, never the host", () => {
    expect(listeningRole({ hostId: HOST_ID, viewerId: MEMBER_ID, isMember: true })).toBe("member");
  });

  it("gives no role to a non-member", () => {
    expect(listeningRole({ hostId: HOST_ID, viewerId: MEMBER_ID, isMember: false })).toBe("none");
  });

  it("gives no role without a signed-in viewer", () => {
    expect(listeningRole({ hostId: HOST_ID, viewerId: null, isMember: true })).toBe("none");
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

describe("canHostLeave", () => {
  it("allows an empty room (0 members)", () => {
    expect(canHostLeave(0)).toBe(true);
  });

  it("allows the host to leave when alone (1 member)", () => {
    expect(canHostLeave(1)).toBe(true);
  });

  it("blocks the host while other members remain (2 members)", () => {
    expect(canHostLeave(2)).toBe(false);
  });
});
