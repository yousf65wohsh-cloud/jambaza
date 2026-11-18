"use client";

import { HomeIcon, LibraryIcon, MusicIcon, UsersIcon } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof HomeIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: HomeIcon },
  { href: "/music", label: "الموسيقى", icon: MusicIcon },
  { href: "/library", label: "مكتبتي", icon: LibraryIcon },
  { href: "/friends", label: "الأصدقاء", icon: UsersIcon },
];

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") {
    return pathname === "/";
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
