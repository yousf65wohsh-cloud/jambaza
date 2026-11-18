"use client";

import { useEffect, useState } from "react";

import { FriendsActivityPanel } from "@/components/friends/FriendsActivityPanel";
import { cn } from "@/lib/utils";

function FriendsColumn({
  onVisibilityChange,
}: {
  onVisibilityChange: (visible: boolean) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    onVisibilityChange(visible);
  }, [visible, onVisibilityChange]);

  // Unmounting (route change or sign-out) must release the reserved space.
  useEffect(() => () => onVisibilityChange(false), [onVisibilityChange]);

  return (
    <aside
      aria-label="الأصدقاء الذين يستمعون الآن"
      className={cn(
        "border-border/70 bg-surface/40 fixed top-16 end-0 bottom-20 z-40 w-72 overflow-y-auto border-s p-4",
        visible ? "hidden xl:block" : "hidden",
      )}
    >
      <FriendsActivityPanel hideWhenEmpty onEntriesChange={setVisible} />
    </aside>
  );
}

/**
 * Fixed left column on wide screens, mirroring the side navigation on the
 * right. It stays out of the layout until the activity panel actually has
 * something to show, and only renders for signed-in listeners.
 */
export function HomeFriendsColumn({
  enabled,
  onVisibilityChange,
}: {
  enabled: boolean;
  /** Lets the app shell reserve the column width only when it is visible. */
  onVisibilityChange: (visible: boolean) => void;
}) {
  if (!enabled) {
    return null;
  }

  return <FriendsColumn onVisibilityChange={onVisibilityChange} />;
}
