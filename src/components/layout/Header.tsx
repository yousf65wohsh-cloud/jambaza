"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

import { Button } from "../ui/Button";
import { OnlineIndicator } from "./OnlineIndicator";

export function Header() {
  const [user, setUser] = useState<User | null | undefined>(() =>
    hasSupabaseEnv() ? undefined : null,
  );

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      return;
    }

    let active = true;
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active) setUser(data.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="border-border/70 bg-background/85 fixed inset-x-0 top-0 z-50 h-16 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="جمبزة — الرئيسية">
          <span className="bg-accent text-accent-foreground grid size-9 place-items-center rounded-xl text-lg font-extrabold">
            ج
          </span>
          <span className="text-xl font-extrabold tracking-tight">جمبزة</span>
        </Link>

        <div className="flex items-center gap-2">
          <OnlineIndicator />
          {user === undefined ? (
            <span className="bg-surface-2 h-8 w-16 animate-pulse rounded-lg" aria-hidden="true" />
          ) : user ? (
            <LogoutButton compact />
          ) : (
            <Link href="/login">
              <Button size="sm" variant="secondary">
                دخول
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
