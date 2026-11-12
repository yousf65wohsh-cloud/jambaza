"use client";

import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

import { WifiIcon, WifiOffIcon } from "../ui/icons";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * `useSyncExternalStore` keeps the server snapshot (online) and the client
 * snapshot (navigator.onLine) separate, avoiding hydration mismatches.
 */
export function OnlineIndicator() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  return (
    <span
      role="status"
      aria-live="polite"
      title={online ? "متصل بالإنترنت" : "غير متصل بالإنترنت"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        online
          ? "border-success/30 bg-success/10 text-success"
          : "border-danger/30 bg-danger/10 text-danger",
      )}
    >
      {online ? <WifiIcon className="size-3.5" /> : <WifiOffIcon className="size-3.5" />}
      <span className="hidden sm:inline">{online ? "متصل" : "غير متصل"}</span>
    </span>
  );
}
