import { createClient } from "@/lib/supabase/client";
import type { ProfileRole } from "@/types/database";

/**
 * Reads the signed-in user's role from `public.profiles`.
 * Returns `null` when there is no session or the profile cannot be read.
 */
export async function getCurrentUserRole(): Promise<ProfileRole | null> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.role;
}
