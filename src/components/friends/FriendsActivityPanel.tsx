"use client";

import { useEffect, useState } from "react";

import { TrackCover } from "@/components/catalog/TrackCover";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { HeadphonesIcon } from "@/components/ui/icons";
import { listActiveFriends, type ActiveFriend } from "@/lib/friends/presence";
import { inviteFriendToSession } from "@/lib/rooms/invites";
import { useListeningSessionStore } from "@/stores/listeningSession";

const PRESENCE_REFRESH_MS = 60_000;

function friendName(entry: ActiveFriend): string {
  return entry.displayName || entry.username;
}

/** Side panel: accepted friends who started a track within the last 10 minutes. */
export function FriendsActivityPanel({
  hideWhenEmpty = false,
  onEntriesChange,
}: {
  hideWhenEmpty?: boolean;
  /** Reports whether the panel currently has something to show. */
  onEntriesChange?: (hasContent: boolean) => void;
}) {
  const openSession = useListeningSessionStore((state) => state.open);
  const [entries, setEntries] = useState<ActiveFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busyFriendId, setBusyFriendId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      const result = await listActiveFriends();

      if (!active) return;

      if (result.ok) {
        setEntries(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
    }

    void refresh();

    const timer = setInterval(() => void refresh(), PRESENCE_REFRESH_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const hasContent = !loading && (entries.length > 0 || error !== null);

  useEffect(() => {
    onEntriesChange?.(hasContent);
  }, [hasContent, onEntriesChange]);

  async function handleInvite(entry: ActiveFriend) {
    if (busyFriendId) return;

    setBusyFriendId(entry.friendId);
    setNotice(null);
    setActionError(null);

    const result = await inviteFriendToSession(entry.friendId);

    setBusyFriendId(null);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    const name = friendName(entry);

    openSession({ roomId: result.data.roomId, peerName: name });
    setNotice(
      result.data.alreadyPending
        ? `لديك دعوة معلّقة إلى ${name} بالفعل، وفُتحت نافذة الاستماع.`
        : `تم إرسال دعوة إلى ${name} وفُتحت نافذة الاستماع. سينضم بعد موافقته.`,
    );
  }

  /**
   * Home-page mode: stay out of the layout until there is something to show.
   * A real query failure still renders so the listener knows the list is stale.
   */
  if (hideWhenEmpty && (loading || (!error && entries.length === 0))) {
    return null;
  }

  return (
    <Card className="space-y-4">
      <CardHeader>
        <CardTitle>يستمعون الآن</CardTitle>
        <CardDescription>
          أصدقاؤك الذين شغّلوا أغنية خلال آخر عشر دقائق. إرسال الدعوة لا يضيفهم إلى
          الغرفة قبل موافقتهم.
        </CardDescription>
      </CardHeader>

      {notice ? (
        <p
          role="status"
          className="bg-success/10 border-success/30 text-success rounded-xl border px-3 py-2 text-xs"
        >
          {notice}
        </p>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-3 py-2 text-xs"
        >
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <p className="text-muted flex items-center gap-2 text-xs">
          <Spinner />
          جارٍ تحميل النشاط…
        </p>
      ) : error ? (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : entries.length === 0 ? (
        <p className="border-border/70 text-muted rounded-xl border border-dashed px-3 py-4 text-center text-xs">
          لا يوجد أصدقاء يستمعون الآن.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.friendId}
              className="border-border/70 bg-surface-2/40 space-y-2 rounded-xl border p-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="w-10 shrink-0 overflow-hidden rounded-lg">
                  <TrackCover track={entry.track} />
                </span>
                <div className="min-w-0">
                  <p dir="auto" className="truncate text-sm font-bold">
                    {friendName(entry)}
                  </p>
                  <p dir="auto" className="text-muted truncate text-xs">
                    {entry.track.title}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                loading={busyFriendId === entry.friendId}
                disabled={busyFriendId !== null && busyFriendId !== entry.friendId}
                onClick={() => void handleInvite(entry)}
              >
                <HeadphonesIcon className="size-4" />
                استمع معه
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
