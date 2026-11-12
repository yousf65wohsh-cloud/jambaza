"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { SideNav } from "./SideNav";

const AUTH_ROUTES = ["/login", "/signup"];

/**
 * Renders the app chrome (header + responsive navigation) for every page.
 * Auth pages are intentionally full-screen and chrome-free.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isAuthRoute) {
    return <div className="min-h-dvh">{children}</div>;
  }

  return (
    <>
      <Header />
      <SideNav />
      <div className="min-h-dvh pt-16 md:ps-60">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 md:pb-12">{children}</div>
      </div>
      <BottomNav />
    </>
  );
}
