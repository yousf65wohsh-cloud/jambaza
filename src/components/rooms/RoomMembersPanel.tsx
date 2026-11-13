"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { listMyFriendships } from "@/lib/friends/data";
import type { FriendProfile, GroupedFriendships } from "@/lib/friends/mapping";
import {
  getMyProfile,
  getRoom,
  inviteFriend,
  leaveRoom,
  listRoomMembers,
  removeMember,
  type RoomMember,
  type RoomSummary,
} from "@/lib/rooms/data";
import { canInvite, isHost } from "@/lib/rooms/membership";

import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Spinner } from "../ui/Spinner";

function MemberIdentity({
  profile,
  userId,
}: {
  profile: FriendProfile | null;
  userId: string;
}) {
  const name = profile
    ? profile.displayName || profile.username
    : `عضو ${userId.slice(0, 8)}…`;
  const initial = profile ? name.slice(0, 1) : userId.slice(0, 1).toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-3">
      {profile?.avatarUrl ? (
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
          {initial}
        </span>
      )}

      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{name}</span>
        <span dir="ltr" className="text-muted block truncate text-xs">
          {profile ? `@${profile.username}` : userId.slice(0, 8)}
        </span>
      </span>
    </div>
  );
}

export function RoomMembersPanel({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [friendships, setFriendships] = useState<GroupedFriendships | null>(null);
  const [profile, setProfile] = useState<FriendProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [inviteTarget, setInviteTarget] = useState("");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const [roomResult, membersResult, friendshipsResult, profileResult] =
        await Promise.all([
          getRoom(roomId),
          listRoomMembers(roomId),
          listMyFriendships(),
          getMyProfile(),
        ]);

      if (!active) return;

      if (!roomResult.ok) {
        setLoadError(roomResult.error.message);
        setLoading(false);
        return;
      }

      if (!membersResult.ok) {
        setLoadError(membersResult.error.message);
        setLoading(false);
        return;
      }

      setRoom(roomResult.data);
      setMembers(membersResult.data);
      // Names and the invite list depend on the friends RPC; when it is not
      // available the member rows still render with a short id fallback.
      setFriendships(friendshipsResult.ok ? friendshipsResult.data : null);
      setProfile(profileResult.ok ? profileResult.data : null);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [roomId, reloadKey]);

  const memberIds = useMemo(
    () => new Set(members.map((member) => member.userId)),
    [members],
  );

  const candidates = useMemo(() => {
    if (!friendships) return [];

    return friendships.accepted.filter(
      (friendship) => !memberIds.has(friendship.friend.id),
    );
  }, [friendships, memberIds]);

  function profileFor(userId: string): FriendProfile | null {
    if (profile?.id === userId) {
      return profile;
    }

    return (
      friendships?.accepted.find(
        (friendship) => friendship.friend.id === userId,
      )?.friend ?? null
    );
  }

  async function handleInvite() {
    if (!inviteTarget || actionKey) return;

    setActionKey("invite");
    setActionError(null);
    setNotice(null);

    const result = await inviteFriend(roomId, inviteTarget);

    setActionKey(null);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    setInviteTarget("");
    setNotice("تمت دعوة الصديق إلى الغرفة.");
    setReloadKey((current) => current + 1);
  }

  async function handleRemove(memberId: string) {
    if (actionKey) return;

    const key = `remove:${memberId}`;

    setActionKey(key);
    setActionError(null);
    setNotice(null);

    const result = await removeMember(roomId, memberId);

    setActionKey(null);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    setNotice("تمت إزالة العضو من الغرفة.");
    setReloadKey((current) => current + 1);
  }

  async function handleLeave() {
    if (actionKey) return;

    setActionKey("leave");
    setActionError(null);
    setNotice(null);

    const result = await leaveRoom(roomId);

    setActionKey(null);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    router.push("/rooms");
  }

  const currentHost = room ? isHost(room, room.viewerId) : false;
  const currentUserCanInvite = room ? canInvite(room, room.viewerId) : false;

  return (
    <section aria-labelledby="room-members-title" className="mt-6 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="room-members-title" className="text-lg font-bold">
          أعضاء الغرفة
        </h2>
        {room ? (
          <span className="text-muted text-xs">{members.length} عضو</span>
        ) : null}
      </div>

      <Card>
        {loading ? (
          <div className="text-muted flex items-center justify-center gap-3 py-8 text-sm">
            <Spinner />
            <span>جارٍ تحميل الأعضاء…</span>
          </div>
        ) : null}

        {!loading && loadError ? (
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

        {!loading && !loadError && room ? (
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

            {members.length === 0 ? (
              <p className="border-border/70 text-muted rounded-xl border border-dashed px-3 py-4 text-center text-xs">
                لا يوجد أعضاء في هذه الغرفة بعد.
              </p>
            ) : (
              <ul className="space-y-2">
                {members.map((member) => {
                  const host = member.userId === room.hostId;
                  const self = member.userId === room.viewerId;
                  const removeKey = `remove:${member.userId}`;

                  return (
                    <li
                      key={member.userId}
                      className="border-border/70 bg-surface-2/40 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                    >
                      <MemberIdentity
                        profile={profileFor(member.userId)}
                        userId={member.userId}
                      />

                      <div className="flex shrink-0 items-center gap-2">
                        {self ? (
                          <span className="text-muted text-[11px] font-medium">أنت</span>
                        ) : null}

                        {host ? (
                          <span className="border-success/30 bg-success/10 text-success inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium">
                            المضيف
                          </span>
                        ) : null}

                        {currentHost && !host ? (
                          <Button
                            size="sm"
                            variant="danger"
                            loading={actionKey === removeKey}
                            disabled={Boolean(actionKey) && actionKey !== removeKey}
                            onClick={() => void handleRemove(member.userId)}
                          >
                            إزالة
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {currentUserCanInvite ? (
              <div className="border-border/70 space-y-3 border-t pt-4">
                <div>
                  <h3 className="text-sm font-bold">دعوة صديق</h3>
                  <p className="text-muted text-xs leading-5">
                    تظهر هنا أصدقاؤك المقبولون غير الموجودين في الغرفة.
                  </p>
                </div>

                {friendships === null ? (
                  <p className="text-muted text-xs">
                    تعذّر تحميل قائمة الأصدقاء، لذا لا يمكن عرض المرشحين الآن.
                  </p>
                ) : candidates.length === 0 ? (
                  <p className="text-muted text-xs">
                    {friendships.accepted.length === 0
                      ? "لا يوجد أصدقاء مقبولون بعد. أضف أصدقاء من صفحة الأصدقاء أولاً."
                      : "كل أصدقائك المقبولين أعضاء في الغرفة بالفعل."}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`invite-friend-${roomId}`}
                        className="mb-1.5 block text-xs font-medium"
                      >
                        الصديق
                      </label>
                      <select
                        id={`invite-friend-${roomId}`}
                        className="field"
                        value={inviteTarget}
                        onChange={(event) => setInviteTarget(event.target.value)}
                        disabled={Boolean(actionKey)}
                      >
                        <option value="">اختر صديقاً…</option>
                        {candidates.map((friendship) => (
                          <option key={friendship.friend.id} value={friendship.friend.id}>
                            {friendship.friend.displayName || friendship.friend.username}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      onClick={() => void handleInvite()}
                      loading={actionKey === "invite"}
                      disabled={!inviteTarget || Boolean(actionKey)}
                    >
                      دعوة
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="border-border/70 text-muted border-t pt-4 text-xs leading-5">
                المضيف فقط يمكنه دعوة الأصدقاء وإزالة الأعضاء.
              </p>
            )}

            <div className="border-border/70 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <p className="text-muted text-xs leading-5">
                {currentHost
                  ? "أنت المضيف. مغادرة الغرفة تحذف عضويتك فقط، وتبقى الغرفة محفوظة."
                  : "يمكنك مغادرة الغرفة في أي وقت."}
              </p>
              <Button
                variant="danger"
                onClick={() => void handleLeave()}
                loading={actionKey === "leave"}
                disabled={Boolean(actionKey) && actionKey !== "leave"}
              >
                مغادرة الغرفة
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
