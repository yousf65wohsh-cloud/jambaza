"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Browser-side Supabase client. Uses only the public URL and anon key.
 * The client is cached so auth state and Realtime subscriptions are shared.
 */
export function createClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey } = getSupabaseEnv();
  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}
