import type { Metadata } from "next";

import { RoomClient } from "@/components/rooms/RoomClient";
import { RoomMembersPanel } from "@/components/rooms/RoomMembersPanel";

export const metadata: Metadata = {
  title: "غرفة استماع",
};

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <RoomClient roomId={id} />
      <RoomMembersPanel roomId={id} />
    </>
  );
}
