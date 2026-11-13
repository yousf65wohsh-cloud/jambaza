"use client";

import { useState } from "react";

import { RoomClient } from "./RoomClient";
import { RoomVideoEditor } from "./RoomVideoEditor";

/**
 * Client wrapper for the room page.
 *
 * `roomKey` is bumped by the host-only video editor after a successful save,
 * which remounts `RoomClient` so the room data (and the shown video id) is
 * reloaded. The sync logic inside `useRoomSync` is left untouched.
 */
export function RoomPageClient({ roomId }: { roomId: string }) {
  const [roomKey, setRoomKey] = useState(0);

  return (
    <>
      <RoomClient key={roomKey} roomId={roomId} />
      <RoomVideoEditor
        roomId={roomId}
        onSaved={() => setRoomKey((current) => current + 1)}
      />
    </>
  );
}
