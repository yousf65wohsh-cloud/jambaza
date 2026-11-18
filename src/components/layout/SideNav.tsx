"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isNavItemActive, NAV_ITEMS } from "./nav-items";

/**
 * Compact floating navigation bar for desktop. The bar keeps the app's own
 * items and order; labels appear as tooltips on hover and keyboard focus.
 */
export function SideNav() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="التنقل الرئيسي"
      className="border-border/70 bg-surface/80 shadow-raised fixed start-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-panel border p-2 backdrop-blur md:flex"
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
              className="border-border bg-surface-2 text-foreground shadow-card pointer-events-none absolute start-full top-1/2 z-50 ms-3 -translate-y-1/2 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </aside>
  );
}
