"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { SideNav } from "./SideNav";
import { HomeFriendsColumn } from "@/components/friends/HomeFriendsColumn";
import { PlayerBar } from "@/components/player/PlayerBar";
import { PlayerEngine } from "@/components/player/PlayerEngine";
import { ListeningPopup } from "@/components/rooms/ListeningPopup";
import {
  DEFAULT_NAV_SIDE,
  NAV_SIDE_STORAGE_KEY,
  parseNavSide,
  type NavSide,
} from "@/lib/layout/navSide";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

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
  const isHome = pathname === "/";
  const [signedIn, setSignedIn] = useState(false);
  const [homeFriendsVisible, setHomeFriendsVisible] = useState(false);
  const [navSide, setNavSide] = useState<NavSide>(DEFAULT_NAV_SIDE);
  const [allowed, setAllowed] = useState(() => {
    if (!hasSupabaseEnv()) return true;
    return !isAuthRoute && !isProtectedPath(pathname);
  });

  useEffect(() => {
    setNavSide(parseNavSide(window.localStorage.getItem(NAV_SIDE_STORAGE_KEY)));
  }, []);

  function toggleNavSide() {
    setNavSide((current) => {
      const next = current === "right" ? "left" : "right";
      window.localStorage.setItem(NAV_SIDE_STORAGE_KEY, next);
      return next;
    });
  }

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      return;
    }

    let active = true;
    const supabase = createClient();

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      setSignedIn(Boolean(user));

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

      setSignedIn(Boolean(user));

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

  if (isAuthRoute) {
    return <div className="min-h-dvh">{children}</div>;
  }

  return (
    <>
      <Header />
      <SideNav side={navSide} onToggle={toggleNavSide} />
      {isHome ? (
        <HomeFriendsColumn enabled={signedIn} onVisibilityChange={setHomeFriendsVisible} />
      ) : null}
      <div
        className={cn(
          "min-h-dvh pt-16 md:ps-20",
          isHome && signedIn && homeFriendsVisible && "xl:pe-80",
        )}
      >
        <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-48 md:pb-28">
          {allowed ? (
            children
          ) : (
            <div className="flex min-h-[60dvh] items-center justify-center">
              <Spinner className="size-6" />
            </div>
          )}
        </div>
      </div>
      {/*
        Media layer: mounted for every non-auth route and never inside a
        route/auth conditional, so navigating between pages (or the route guard
        re-checking the session) cannot unmount the audio engine or the
        floating listening window.
      */}
      <PlayerEngine />
      <PlayerBar />
      <ListeningPopup />
      <BottomNav />
    </>
  );
}
