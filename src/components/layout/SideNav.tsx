"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { NavSide } from "@/lib/layout/navSide";
import { cn } from "@/lib/utils";

import { isNavItemActive, NAV_ITEMS } from "./nav-items";

/**
 * Compact floating navigation bar for desktop. The bar keeps the app's own
 * items and order; labels appear as tooltips on hover and keyboard focus.
 * The toggle at the bottom moves the bar to the opposite edge.
 */
export function SideNav({ side, onToggle }: { side: NavSide; onToggle: () => void }) {
  const pathname = usePathname();
  const onRight = side === "right";

  return (
    <aside
      aria-label="التنقل الرئيسي"
      className={cn(
        "border-border/70 bg-surface/80 shadow-raised fixed top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-panel border p-2 backdrop-blur md:flex",
        onRight ? "start-4" : "end-4",
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(pathname, item);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative grid size-11 place-items-center rounded-control transition-colors",
              "focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2",
              active
                ? "bg-accent text-white"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <Icon className="size-5" />

            <span
              aria-hidden="true"
              className={cn(
                "border-border bg-surface-2 text-foreground shadow-card pointer-events-none absolute top-1/2 z-50 -translate-y-1/2 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
                onRight ? "start-full ms-3" : "end-full me-3",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      <span aria-hidden="true" className="bg-border/70 my-1 h-px w-8" />

      <button
        type="button"
        onClick={onToggle}
        aria-label={onRight ? "نقل شريط التنقل إلى اليسار" : "نقل شريط التنقل إلى اليمين"}
        title={onRight ? "نقل شريط التنقل إلى اليسار" : "نقل شريط التنقل إلى اليمين"}
        className="text-muted hover:bg-surface-2 hover:text-foreground grid size-11 place-items-center rounded-control transition-colors focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {onRight ? (
          <ChevronLeftIcon className="size-4" />
        ) : (
          <ChevronRightIcon className="size-4" />
        )}
      </button>
    </aside>
  );
}
