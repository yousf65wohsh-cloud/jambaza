"use client";

import { apiFail, apiOk } from "@/lib/api/result";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { ApiResponse } from "@/types/api";

export type DevRole = "listener" | "artist";

const SIGN_IN_MESSAGE = "يجب تسجيل الدخول لتغيير الدور.";
const UPDATE_FAILED_MESSAGE = "تعذّر تحديث الدور. حاول مرة أخرى.";
const MISSING_PROFILE_MESSAGE = "لم يتم العثور على ملفك الشخصي. أعد تسجيل الدخول.";

/** Development-only helper that switches the signed-in user's own role. */
export async function setOwnRole(role: DevRole): Promise<ApiResponse<null>> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new AppError("UNAUTHORIZED", SIGN_IN_MESSAGE, { cause: userError });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", UPDATE_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", MISSING_PROFILE_MESSAGE);
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, UPDATE_FAILED_MESSAGE);
  }
}
