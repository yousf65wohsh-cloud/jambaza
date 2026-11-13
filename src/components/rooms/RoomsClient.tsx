"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createRoom, listMyRooms, type RoomSummary } from "@/lib/rooms/data";
import { isHost } from "@/lib/rooms/membership";

import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Spinner } from "../ui/Spinner";
import { HeadphonesIcon } from "../ui/icons";

const dateFormatter = new Intl.DateTimeFormat("ar", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatRoomDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function RoomCard({ room }: { room: RoomSummary }) {
  const host = isHost(room, room.viewerId);

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="card hover:border-accent/40 block p-4 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-accent/10 text-accent grid size-11 shrink-0 place-items-center rounded-xl">
            <HeadphonesIcon className="size-5" />
          </span>

          <span className="min-w-0">
            <span className="block truncate font-bold">غرفة استماع</span>
            <span className="text-muted block truncate text-xs">
              أُنشئت في {formatRoomDate(room.createdAt)}
            </span>
            <span dir="ltr" className="text-muted block truncate font-mono text-[10px]">
              {room.id}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              host
                ? "border-success/30 bg-success/10 text-success inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium"
                : "border-border bg-surface-2 text-muted inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium"
            }
          >
            {host ? "أنت المضيف" : "عضو"}
          </span>
          <span className="border-border bg-surface-2 text-muted inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium">
            {room.videoId ? "فيديو محدد" : "بانتظار الفيديو"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RoomsClient() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const result = await listMyRooms();

      if (!active) return;

      if (result.ok) {
        setRooms(result.data);
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

  async function handleCreate() {
    if (creating) return;

    setCreating(true);
    setActionError(null);

    const result = await createRoom();

    setCreating(false);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    router.push(`/rooms/${result.data.id}`);
  }

  const isEmpty = rooms !== null && rooms.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted text-sm leading-6">
          كل غرفة تضم مضيفاً واحداً وأعضاء يدعوهم من قائمة أصدقائه المقبولين.
        </p>
        <Button onClick={() => void handleCreate()} loading={creating} className="gap-2">
          <HeadphonesIcon className="size-4" />
          غرفة جديدة
        </Button>
      </div>

      {actionError ? (
        <p
          role="alert"
          className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-3 py-2 text-sm"
        >
          {actionError}
        </p>
      ) : null}

      {loading && rooms === null ? (
        <div className="border-border/80 bg-surface/50 flex items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-14">
          <Spinner />
          <span className="text-muted text-sm">جارٍ تحميل غرف الاستماع…</span>
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
          icon={<HeadphonesIcon className="size-6" />}
          title="لا توجد غرف استماع بعد"
          description="أنشئ غرفة جديدة وادعُ أصدقاءك المقبولين للاستماع معاً. ستظهر كل غرفك هنا."
          action={
            <Button onClick={() => void handleCreate()} loading={creating}>
              غرفة جديدة
            </Button>
          }
        />
      ) : null}

      {rooms && rooms.length > 0 ? (
        <ul className="space-y-3">
          {rooms.map((room) => (
            <li key={room.id}>
              <RoomCard room={room} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
