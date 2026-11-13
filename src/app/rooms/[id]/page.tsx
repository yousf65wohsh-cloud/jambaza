import type { Metadata } from "next";

import { RoomMembersPanel } from "@/components/rooms/RoomMembersPanel";
import { RoomPageClient } from "@/components/rooms/RoomPageClient";

export const metadata: Metadata = {
  title: "غرفة استماع",
};

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <RoomPageClient roomId={id} />
      <RoomMembersPanel roomId={id} />
    </>
  );
}
