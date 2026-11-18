"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { setOwnRole, type DevRole } from "@/lib/profile/devRole";

const RELOAD_DELAY_MS = 600;

function DevRoleSwitchControls() {
  const [busyRole, setBusyRole] = useState<DevRole | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSwitch(role: DevRole) {
    if (busyRole) return;

    setBusyRole(role);
    setMessage(null);
    setError(null);

    const result = await setOwnRole(role);

    if (!result.ok) {
      setError(result.error.message);
      setBusyRole(null);
      return;
    }

    setMessage(
      role === "artist"
        ? "تم تفعيل وضع الفنان. سيتم تحديث الصفحة..."
        : "تمت العودة إلى وضع المستمع. سيتم تحديث الصفحة...",
    );

    window.setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
  }

  return (
    <section
      dir="rtl"
      aria-label="أداة تجريب محلية"
      className="border-border bg-surface-2/40 space-y-3 rounded-xl border border-dashed p-3"
    >
      <p className="text-muted text-xs font-bold">أداة تجريب (محلية)</p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          loading={busyRole === "artist"}
          disabled={busyRole !== null}
          onClick={() => void handleSwitch("artist")}
        >
          تفعيل وضع الفنان
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={busyRole === "listener"}
          disabled={busyRole !== null}
          onClick={() => void handleSwitch("listener")}
        >
          العودة لمستمع
        </Button>
      </div>

      {message ? (
        <p role="status" className="text-success text-xs">
          {message}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function DevRoleSwitch() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <DevRoleSwitchControls />;
}
