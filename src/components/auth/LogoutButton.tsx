"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { Button } from "../ui/Button";
import { LogoutIcon } from "../ui/icons";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);
    try {
      await createClient().auth.signOut();
    } catch {
      // Local session state is cleared by the client even when the network
      // call fails; still send the user to the login screen.
    } finally {
      router.replace("/login");
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      loading={loading}
      aria-label="تسجيل الخروج"
      title="تسجيل الخروج"
    >
      <LogoutIcon className="size-4" />
      {compact ? null : <span>خروج</span>}
    </Button>
  );
}
