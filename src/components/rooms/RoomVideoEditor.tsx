"use client";

import { useEffect, useState } from "react";

import { getRoom, setRoomVideo, type RoomSummary } from "@/lib/rooms/data";
import { isHost } from "@/lib/rooms/membership";
import { applyRoomPlayback } from "@/lib/rooms/playback";
import { parseYouTubeVideoId } from "@/lib/youtube";

import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";

const INVALID_LINK_MESSAGE = "الرابط غير صالح. الصق رابط يوتيوب صحيحاً.";
const SAVED_MESSAGE = "تم حفظ فيديو الغرفة.";

/**
 * Host-only form that stores just the 11-character YouTube id.
 *
 * The pasted link is parsed locally and never persisted; only the id reaches
 * `setRoomVideo`. After a successful save the room is re-read, the new video is
 * loaded into the player, and `onSaved` lets the page reload the room panel.
 */
export function RoomVideoEditor({
  roomId,
  onSaved,
}: {
  roomId: string;
  onSaved?: () => void;
}) {
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const result = await getRoom(roomId);

      if (!active || !result.ok) return;

      setRoom(result.data);
    }

    void load();

    return () => {
      active = false;
    };
  }, [roomId]);

  if (!room || !isHost(room, room.viewerId)) {
    return null;
  }

  async function handleSave() {
    if (saving) return;

    setError(null);
    setNotice(null);

    const videoId = parseYouTubeVideoId(link);

    if (!videoId) {
      setError(INVALID_LINK_MESSAGE);
      return;
    }

    setSaving(true);

    const result = await setRoomVideo(roomId, videoId);

    if (!result.ok) {
      setSaving(false);
      setError(result.error.message);
      return;
    }

    const refreshed = await getRoom(roomId);

    setSaving(false);
    setLink("");
    setNotice(SAVED_MESSAGE);

    if (refreshed.ok) {
      setRoom(refreshed.data);
      applyRoomPlayback(refreshed.data);
    }

    onSaved?.();
  }

  return (
    <section aria-labelledby="room-video-title" className="mt-6 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="room-video-title" className="text-lg font-bold">
          فيديو الغرفة
        </h2>
        <span className="text-muted text-xs">
          الفيديو الحالي:{" "}
          <span dir="ltr" className="text-foreground font-mono">
            {room.videoId || "—"}
          </span>
        </span>
      </div>

      <Card>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div>
            <p className="text-muted text-xs leading-5">
              الصق رابط فيديو يوتيوب أو معرّف الفيديو المكوّن من 11 حرفاً. يُحفظ المعرّف فقط،
              ولا يُخزَّن الرابط الكامل.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                label="رابط فيديو يوتيوب"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                dir="ltr"
                className="text-left"
                autoComplete="off"
                spellCheck={false}
                disabled={saving}
                error={error}
              />
            </div>

            <Button type="submit" loading={saving} disabled={!link.trim() || saving}>
              حفظ الفيديو
            </Button>
          </div>

          {notice ? (
            <p role="status" className="text-success text-xs">
              {notice}
            </p>
          ) : null}
        </form>
      </Card>
    </section>
  );
}
