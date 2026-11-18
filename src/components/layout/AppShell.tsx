"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { SideNav } from "./SideNav";
import { PlayerBar } from "@/components/player/PlayerBar";
import { PlayerEngine } from "@/components/player/PlayerEngine";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/Spinner";

const AUTH_ROUTES = ["/login", "/signup"];
const PROTECTED_PREFIXES = ["/library", "/friends", "/rooms", "/account", "/playlists"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Renders the app chrome (header + responsive navigation) for every page.
 * Auth pages are intentionally full-screen and chrome-free.
 * Client-side route guard replaces middleware for the static export build.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const [allowed, setAllowed] = useState(() => {
    if (!hasSupabaseEnv()) return true;
    return !isAuthRoute && !isProtectedPath(pathname);
  });

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setAllowed(true);
      return;
    }

    let active = true;
    const supabase = createClient();

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user && isProtectedPath(pathname)) {
        setAllowed(false);
        router.replace("/login");
        return;
      }

      if (user && isAuthRoute) {
        setAllowed(false);
        router.replace("/");
        return;
      }

      setAllowed(true);
    }

    void check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user ?? null;

      if (!user && isProtectedPath(pathname)) {
        setAllowed(false);
        router.replace("/login");
        return;
      }

      if (user && isAuthRoute) {
        setAllowed(false);
        router.replace("/");
        return;
      }

      setAllowed(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isAuthRoute, pathname, router]);

  if (!allowed) {
    if (isAuthRoute) {
      return <div className="min-h-dvh" />;
    }

    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isAuthRoute) {
    return <div className="min-h-dvh">{children}</div>;
  }

  return (
    <>
      <Header />
      <SideNav />
      <div className="min-h-dvh pt-16 md:ps-60">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-48 md:pb-28">{children}</div>
      </div>
      <PlayerEngine />
      <PlayerBar />
      <BottomNav />
    </>
  );
}
