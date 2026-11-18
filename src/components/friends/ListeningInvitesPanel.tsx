"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { HeadphonesIcon } from "@/components/ui/icons";
import {
  listIncomingInvites,
  respondToInvite,
  type IncomingInvite,
} from "@/lib/rooms/invites";

const INVITES_REFRESH_MS = 60_000;

function hostName(invite: IncomingInvite): string {
  return invite.hostDisplayName || invite.hostUsername;
}

/** Pending listening-room invitations addressed to the signed-in user. */
export function ListeningInvitesPanel() {
  const router = useRouter();
  const [invites, setInvites] = useState<IncomingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      const result = await listIncomingInvites();

      if (!active) return;

      if (result.ok) {
        setInvites(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
    }

    void refresh();

    const timer = setInterval(() => void refresh(), INVITES_REFRESH_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  async function handleRespond(invite: IncomingInvite, accept: boolean) {
    if (busyInviteId) return;

    setBusyInviteId(invite.id);
    setActionError(null);

    const result = await respondToInvite(invite.id, accept);

    setBusyInviteId(null);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    if (accept && result.data) {
      router.push(`/rooms?id=${result.data.roomId}`);
      return;
    }

    setInvites((current) => current.filter((item) => item.id !== invite.id));
  }

  return (
    <Card className="space-y-4">
      <CardHeader>
        <CardTitle>دعوات الاستماع</CardTitle>
        <CardDescription>
          أصدقاء دعوك لجلسة استماع مشتركة. لن تنضم إلى الغرفة قبل قبولك.
        </CardDescription>
      </CardHeader>

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
          جارٍ تحميل الدعوات…
        </p>
      ) : error ? (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : invites.length === 0 ? (
        <p className="border-border/70 text-muted rounded-xl border border-dashed px-3 py-4 text-center text-xs">
          لا توجد دعوات استماع جديدة.
        </p>
      ) : (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="border-border/70 bg-surface-2/40 space-y-2 rounded-xl border p-2.5"
            >
              <p className="flex items-center gap-1.5 text-xs">
                <HeadphonesIcon className="text-accent size-3.5 shrink-0" />
                <span dir="auto" className="truncate font-bold">
                  {hostName(invite)}
                </span>
                <span className="text-muted shrink-0">دعاك للاستماع</span>
              </p>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  loading={busyInviteId === invite.id}
                  disabled={busyInviteId !== null && busyInviteId !== invite.id}
                  onClick={() => void handleRespond(invite, true)}
                >
                  قبول
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  disabled={busyInviteId !== null}
                  onClick={() => void handleRespond(invite, false)}
                >
                  رفض
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
