import type { Metadata } from "next";

import { PlaylistClient } from "@/components/playlists/PlaylistClient";

export const metadata: Metadata = {
  title: "قائمة التشغيل",
};

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="space-y-6">
      <PlaylistClient playlistId={id} />
    </main>
  );
}
