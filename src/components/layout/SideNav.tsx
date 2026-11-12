"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { HeadphonesIcon } from "../ui/icons";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="border-border/70 bg-surface/40 fixed top-16 start-0 bottom-0 z-40 hidden w-60 border-e p-4 md:block">
      <p className="text-muted mb-3 px-3 text-xs font-bold tracking-wide">تنقّل</p>
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent/10 text-accent border-accent/20 border font-bold"
                    : "text-muted hover:bg-surface-2 hover:text-foreground border border-transparent",
                )}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-border/70 text-muted absolute inset-x-4 bottom-5 border-t pt-4 text-xs leading-5">
        <p className="text-foreground flex items-center gap-2 font-bold">
          <HeadphonesIcon className="text-accent size-4" />
          جمبزة
        </p>
        <p className="mt-1">استمع مع أصدقائك.</p>
      </div>
    </aside>
  );
}
