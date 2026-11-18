"use client";

import { useEffect, useState } from "react";

import { TrackCover } from "@/components/catalog/TrackCover";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { HeadphonesIcon } from "@/components/ui/icons";
import { listActiveFriends, type ActiveFriend } from "@/lib/friends/presence";

const PRESENCE_REFRESH_MS = 60_000;

function friendName(entry: ActiveFriend): string {
  return entry.displayName || entry.username;
}

/** Side panel: accepted friends who started a track within the last 10 minutes. */
export function FriendsActivityPanel() {
  const [entries, setEntries] = useState<ActiveFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Card className="space-y-4">
      <CardHeader>
        <CardTitle>يستمعون الآن</CardTitle>
        <CardDescription>
          أصدقاؤك الذين شغّلوا أغنية خلال آخر عشر دقائق. الانضمام إلى غرفة يتطلب موافقة الصديق.
        </CardDescription>
      </CardHeader>

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
                disabled
                title="بانتظار موافقة الصديق على الانضمام."
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
