"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  acceptFriendRequest,
  listMyFriendships,
  removeFriendship,
  searchProfiles,
  sendFriendRequest,
} from "@/lib/friends/data";
import type {
  FriendProfile,
  Friendship,
  GroupedFriendships,
} from "@/lib/friends/mapping";
import {
  listFriendsNowListening,
  type NowListeningEntry,
} from "@/lib/friends/presence";

import type { ApiResponse } from "@/types/api";

import { Button } from "../ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";
import { HeadphonesIcon, UsersIcon } from "../ui/icons";
import { AddFriendByCodeForm } from "./AddFriendByCodeForm";
import { FriendCodeCard } from "./FriendCodeCard";
import { RemoveFriendDialog } from "./RemoveFriendDialog";

const SEARCH_DEBOUNCE_MS = 300;
const PRESENCE_REFRESH_MS = 60_000;

type Relationship = "accepted" | "incoming" | "outgoing";
type SearchStatus = "idle" | "loading" | "done";

function Identity({ profile }: { profile: FriendProfile }) {
  const name = profile.displayName || profile.username;

  return (
    <div className="flex min-w-0 items-center gap-3">
      {profile.avatarUrl ? (
        // Avatar URLs are public Supabase URLs; next/image is not used for them.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt={`صورة ${name}`}
          loading="lazy"
          className="bg-surface-2 size-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="bg-surface-2 text-accent grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold"
        >
          {name.slice(0, 1)}
        </span>
      )}

      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{name}</span>
        <span dir="ltr" className="text-muted block truncate text-xs">
          @{profile.username}
        </span>
      </span>
    </div>
  );
}

function NowListeningLine({ entry }: { entry: NowListeningEntry }) {
  return (
    <p className="text-muted mt-2 flex min-w-0 items-center gap-1.5 text-xs">
      <HeadphonesIcon className="text-accent size-3.5 shrink-0" />
      <span className="shrink-0">يستمع الآن إلى</span>
      <span dir="auto" className="text-foreground truncate font-bold">
        {entry.track.title}
      </span>
      {entry.track.artist ? (
        <span dir="auto" className="truncate">
          — {entry.track.artist}
        </span>
      ) : null}
    </p>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children}
    </Card>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="border-border/70 text-muted rounded-xl border border-dashed px-3 py-4 text-center text-xs">
      {children}
    </p>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <li className="border-border/70 bg-surface-2/40 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
      {children}
    </li>
  );
}

export function FriendsClient() {
  const [friendships, setFriendships] = useState<GroupedFriendships | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [nowListening, setNowListening] = useState<Map<string, NowListeningEntry>>(
    () => new Map(),
  );
  const [presenceError, setPresenceError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);

  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<Friendship | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQuery = useRef("");
  const mounted = useRef(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const result = await listMyFriendships();

      if (!active) return;

      if (result.ok) {
        setFriendships(result.data);
      } else {
        setLoadError(result.error.message);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;

    async function refreshPresence() {
      const result = await listFriendsNowListening();

      if (!active) return;

      if (result.ok) {
        setNowListening(
          new Map(result.data.map((entry) => [entry.friendId, entry])),
        );
        setPresenceError(null);
      } else {
        setPresenceError(result.error.message);
      }
    }

    void refreshPresence();

    const timer = setInterval(() => void refreshPresence(), PRESENCE_REFRESH_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [reloadKey]);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    latestQuery.current = value.trim();

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }

    const normalized = latestQuery.current;

    if (normalized === "") {
      setResults([]);
      setSearchError(null);
      setSearchStatus("idle");
      return;
    }

    setSearchStatus("loading");
    setSearchError(null);

    searchTimer.current = setTimeout(() => {
      searchTimer.current = null;

      void searchProfiles(normalized).then((result) => {
        if (!mounted.current || latestQuery.current !== normalized) return;

        if (result.ok) {
          setResults(result.data);
        } else {
          setResults([]);
          setSearchError(result.error.message);
        }

        setSearchStatus("done");
      });
    }, SEARCH_DEBOUNCE_MS);
  }

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

  async function runAction(
    key: string,
    action: () => Promise<ApiResponse<null>>,
    successMessage: string,
  ) {
    if (actionKey) return;

    setActionKey(key);
    setActionError(null);
    setNotice(null);

    const result = await action();

    setActionKey(null);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    setNotice(successMessage);
    setReloadKey((current) => current + 1);
  }

  function handleAddedByCode(profile: FriendProfile) {
    const name = profile.displayName || profile.username;

    setActionError(null);
    setNotice(`تم إرسال طلب الصداقة إلى ${name}.`);
    setReloadKey((current) => current + 1);
  }

  async function handleConfirmRemove() {
    if (!removeTarget || removing) return;

    setRemoving(true);
    setRemoveError(null);

    const result = await removeFriendship(removeTarget.id);

    setRemoving(false);

    if (!result.ok) {
      setRemoveError(result.error.message);
      return;
    }

    setRemoveTarget(null);
    setNotice("تمت إزالة الصديق.");
    setReloadKey((current) => current + 1);
  }

  function renderResultAction(profile: FriendProfile) {
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
        onClick={() =>
          void runAction(key, () => sendFriendRequest(profile.id), "تم إرسال طلب الصداقة.")
        }
      >
        أضف صديق
      </Button>
    );
  }

  const isEmpty =
    friendships !== null &&
    friendships.accepted.length === 0 &&
    friendships.incoming.length === 0 &&
    friendships.outgoing.length === 0;

  return (
    <div className="space-y-4">
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

      <AddFriendByCodeForm onAdded={handleAddedByCode} />

      <FriendCodeCard />

      <Card>
        <CardHeader>
          <CardTitle>ابحث عن أصدقاء</CardTitle>
          <CardDescription>
            اكتب اسم المستخدم للعثور على مستمعين. تظهر أول 20 نتيجة فقط.
          </CardDescription>
        </CardHeader>

        <Input
          label="اسم المستخدم"
          type="search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="مثال: layla"
          autoComplete="off"
          spellCheck={false}
          error={searchError}
        />

        {searchStatus === "loading" ? (
          <p className="text-muted mt-3 flex items-center gap-2 text-xs">
            <Spinner />
            جارٍ البحث…
          </p>
        ) : null}

        {searchStatus === "done" && results.length === 0 && !searchError ? (
          <div className="mt-3">
            <EmptyLine>لا يوجد مستخدمون بهذا الاسم.</EmptyLine>
          </div>
        ) : null}

        {results.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {results.map((profile) => (
              <Row key={profile.id}>
                <Identity profile={profile} />
                <div className="flex shrink-0 items-center gap-2">
                  {renderResultAction(profile)}
                </div>
              </Row>
            ))}
          </ul>
        ) : null}
      </Card>

      {loading && !friendships ? (
        <div className="border-border/80 bg-surface/50 flex items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-14">
          <Spinner />
          <span className="text-muted text-sm">جارٍ تحميل الأصدقاء…</span>
        </div>
      ) : null}

      {loadError ? (
        <div className="border-danger/30 bg-danger/5 rounded-xl border p-4 text-sm">
          <p role="alert" className="text-danger">
            {loadError}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon={<UsersIcon className="size-6" />}
          title="لا يوجد أصدقاء بعد"
          description="ابحث عن اسم مستخدم في الأعلى وأرسل أول طلب صداقة. ستظهر الطلبات الواردة والمرسلة هنا."
        />
      ) : null}

      {friendships && !isEmpty ? (
        <>
          <Section title="طلبات واردة" description="طلبات صداقة تنتظر ردّك.">
            {friendships.incoming.length === 0 ? (
              <EmptyLine>لا توجد طلبات صداقة واردة.</EmptyLine>
            ) : (
              <ul className="space-y-2">
                {friendships.incoming.map((friendship) => {
                  const acceptKey = `accept:${friendship.id}`;
                  const declineKey = `decline:${friendship.id}`;

                  return (
                    <Row key={friendship.id}>
                      <Identity profile={friendship.friend} />
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          loading={actionKey === acceptKey}
                          disabled={Boolean(actionKey) && actionKey !== acceptKey}
                          onClick={() =>
                            void runAction(
                              acceptKey,
                              () => acceptFriendRequest(friendship.id),
                              "تم قبول طلب الصداقة.",
                            )
                          }
                        >
                          قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={actionKey === declineKey}
                          disabled={Boolean(actionKey) && actionKey !== declineKey}
                          onClick={() =>
                            void runAction(
                              declineKey,
                              () => removeFriendship(friendship.id),
                              "تم رفض طلب الصداقة.",
                            )
                          }
                        >
                          رفض
                        </Button>
                      </div>
                    </Row>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="طلبات مرسلة" description="طلبات أرسلتها ولم تُقبل بعد.">
            {friendships.outgoing.length === 0 ? (
              <EmptyLine>لا توجد طلبات صداقة مرسلة.</EmptyLine>
            ) : (
              <ul className="space-y-2">
                {friendships.outgoing.map((friendship) => {
                  const cancelKey = `cancel:${friendship.id}`;

                  return (
                    <Row key={friendship.id}>
                      <Identity profile={friendship.friend} />
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={actionKey === cancelKey}
                        disabled={Boolean(actionKey) && actionKey !== cancelKey}
                        onClick={() =>
                          void runAction(
                            cancelKey,
                            () => removeFriendship(friendship.id),
                            "تم إلغاء طلب الصداقة.",
                          )
                        }
                      >
                        إلغاء الطلب
                      </Button>
                    </Row>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section
            title="أصدقائي"
            description="المستخدمون الذين قبلت صداقتهم، مع ما يستمعون إليه الآن."
          >
            {friendships.accepted.length === 0 ? (
              <EmptyLine>لا يوجد أصدقاء بعد.</EmptyLine>
            ) : (
              <ul className="space-y-2">
                {friendships.accepted.map((friendship) => {
                  const listening = nowListening.get(friendship.friend.id);

                  return (
                    <Row key={friendship.id}>
                      <div className="min-w-0 flex-1">
                        <Identity profile={friendship.friend} />
                        {listening ? <NowListeningLine entry={listening} /> : null}
                      </div>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={removing || Boolean(actionKey)}
                        onClick={() => {
                          setRemoveTarget(friendship);
                          setRemoveError(null);
                        }}
                      >
                        إزالة
                      </Button>
                    </Row>
                  );
                })}
              </ul>
            )}

            {presenceError && friendships.accepted.length > 0 ? (
              <p className="text-muted mt-3 text-xs">{presenceError}</p>
            ) : null}
          </Section>
        </>
      ) : null}

      <RemoveFriendDialog
        friend={removeTarget?.friend ?? null}
        removing={removing}
        error={removeError}
        onCancel={() => {
          if (!removing) {
            setRemoveTarget(null);
            setRemoveError(null);
          }
        }}
        onConfirm={() => void handleConfirmRemove()}
      />
    </div>
  );
}
