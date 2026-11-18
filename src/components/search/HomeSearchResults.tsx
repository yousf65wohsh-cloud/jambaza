"use client";

import { useEffect, useMemo, useState } from "react";

import { TrackCard } from "@/components/catalog/TrackCard";
import { FriendIdentity } from "@/components/friends/FriendIdentity";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { MusicIcon, SearchIcon, UsersIcon } from "@/components/ui/icons";
import { searchTracks } from "@/lib/catalog/data";
import {
  listMyFriendships,
  searchProfiles,
  sendFriendRequest,
} from "@/lib/friends/data";
import type { FriendProfile, GroupedFriendships } from "@/lib/friends/mapping";
import { usePlayerStore } from "@/stores/player";
import type { Track } from "@/types/track";

type Relationship = "accepted" | "incoming" | "outgoing";
type Status = "loading" | "ready";

/**
 * Inline results for the home page search. Tracks come from the catalog search
 * and people from the profile search, so usernames stay findable now that there
 * is no standalone search page.
 */
export function HomeSearchResults({ query }: { query: string }) {
  const setTrack = usePlayerStore((state) => state.setTrack);

  const [status, setStatus] = useState<Status>("loading");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [people, setPeople] = useState<FriendProfile[]>([]);
  const [friendships, setFriendships] = useState<GroupedFriendships | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setStatus("loading");
      setError(null);

      const [tracksResult, peopleResult, friendshipsResult] = await Promise.all([
        searchTracks(query),
        searchProfiles(query),
        listMyFriendships(),
      ]);

      if (!active) return;

      const messages: string[] = [];

      if (tracksResult.ok) {
        setTracks(tracksResult.data);
      } else {
        setTracks([]);
        messages.push(tracksResult.error.message);
      }

      if (peopleResult.ok) {
        setPeople(peopleResult.data);
      } else {
        setPeople([]);
        messages.push(peopleResult.error.message);
      }

      if (friendshipsResult.ok) {
        setFriendships(friendshipsResult.data);
      }

      setError(messages.length > 0 ? messages.join(" ") : null);
      setStatus("ready");
    }

    void load();

    return () => {
      active = false;
    };
  }, [query, reloadKey]);

  const relationships = useMemo(() => {
    const map = new Map<string, Relationship>();
    if (!friendships) return map;

    for (const friendship of friendships.accepted) {
      map.set(friendship.friend.id, "accepted");
    }
    for (const friendship of friendships.incoming) {
      map.set(friendship.friend.id, "incoming");
    }
    for (const friendship of friendships.outgoing) {
      map.set(friendship.friend.id, "outgoing");
    }

    return map;
  }, [friendships]);

  async function handleAddFriend(profile: FriendProfile) {
    const key = `send:${profile.id}`;
    if (actionKey) return;

    setActionKey(key);
    setActionError(null);
    setNotice(null);

    const result = await sendFriendRequest(profile.id);

    setActionKey(null);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    const name = profile.displayName || profile.username;
    setNotice(`تم إرسال طلب الصداقة إلى ${name}.`);
    setReloadKey((current) => current + 1);
  }

  function renderPersonAction(profile: FriendProfile) {
    const relationship = relationships.get(profile.id);
    const key = `send:${profile.id}`;

    if (relationship === "accepted") {
      return <span className="text-muted text-xs font-medium">صديق</span>;
    }

    if (relationship === "outgoing") {
      return <span className="text-muted text-xs font-medium">طلب مرسل</span>;
    }

    if (relationship === "incoming") {
      return <span className="text-accent text-xs font-medium">لديك طلب وارد</span>;
    }

    return (
      <Button
        size="sm"
        loading={actionKey === key}
        disabled={Boolean(actionKey) && actionKey !== key}
        onClick={() => void handleAddFriend(profile)}
      >
        أضف صديق
      </Button>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  const noResults = tracks.length === 0 && people.length === 0;

  return (
    <div className="space-y-8">
      {notice ? (
        <p
          role="status"
          className="bg-success/10 border-success/30 text-success rounded-xl border px-3 py-2 text-sm"
        >
          {notice}
        </p>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-3 py-2 text-sm"
        >
          {actionError}
        </p>
      ) : null}

      {error ? (
        <div className="border-danger/30 bg-danger/5 space-y-3 rounded-xl border p-4 text-sm">
          <p role="alert" className="text-danger">
            {error}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      {noResults && !error ? (
        <EmptyState
          icon={<SearchIcon className="size-6" />}
          title="لا توجد نتائج مطابقة"
          description={`لم نعثر على أغانٍ أو مستخدمين يطابقون «${query}». جرّب كلمات أخرى.`}
        />
      ) : null}

      {tracks.length > 0 ? (
        <section aria-labelledby="home-search-tracks-heading" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="home-search-tracks-heading"
              className="flex items-center gap-2 text-lg font-bold"
            >
              <MusicIcon className="text-accent size-5" />
              الأغاني
            </h2>
            <p className="text-muted text-sm">{tracks.length} نتيجة</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onPlay={(selected) => setTrack(selected, tracks)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {people.length > 0 ? (
        <section aria-labelledby="home-search-people-heading" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="home-search-people-heading"
              className="flex items-center gap-2 text-lg font-bold"
            >
              <UsersIcon className="text-accent size-5" />
              المستخدمون
            </h2>
            <p className="text-muted text-sm">{people.length} نتيجة</p>
          </div>

          <ul className="space-y-2">
            {people.map((profile) => (
              <li
                key={profile.id}
                className="border-border/70 bg-surface-2/40 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
              >
                <FriendIdentity profile={profile} />
                <div className="flex shrink-0 items-center gap-2">
                  {renderPersonAction(profile)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
