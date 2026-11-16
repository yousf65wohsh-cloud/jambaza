"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { apiFail, apiOk } from "@/lib/api/result";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database";

import {
  groupFriendships,
  mapProfileRow,
  normalizeFriendCode,
  normalizeSearchQuery,
  type FriendProfile,
  type GroupedFriendships,
} from "./mapping";

const SIGN_IN_MESSAGE = "يجب تسجيل الدخول لعرض الأصدقاء. سجّل الدخول ثم أعد المحاولة.";
const SEARCH_FAILED_MESSAGE = "تعذّر البحث عن المستخدمين. حاول مرة أخرى.";
const LIST_FAILED_MESSAGE = "تعذّر تحميل قائمة الأصدقاء. حاول مرة أخرى.";
const REQUEST_FAILED_MESSAGE = "تعذّر إرسال طلب الصداقة. حاول مرة أخرى.";
const ACCEPT_FAILED_MESSAGE = "تعذّر قبول طلب الصداقة. حاول مرة أخرى.";
const REMOVE_FAILED_MESSAGE = "تعذّر حذف الصداقة. حاول مرة أخرى.";
const INVALID_CODE_MESSAGE = "رمز الصديق يجب أن يتكون من 8 أحرف أو أرقام.";
const UNKNOWN_CODE_MESSAGE = "لا يوجد مستخدم بهذا الرمز. تأكد من الرمز وحاول مرة أخرى.";
const OWN_CODE_MESSAGE = "هذا رمزك الخاص. شاركه مع أصدقائك بدلاً من إضافته.";
const ADD_BY_CODE_FAILED_MESSAGE = "تعذّر إضافة الصديق بالرمز. حاول مرة أخرى.";
const CODE_LOAD_FAILED_MESSAGE = "تعذّر تحميل رمز الصديق. حاول مرة أخرى.";
const REGENERATE_CODE_FAILED_MESSAGE = "تعذّر توليد رمز جديد. حاول مرة أخرى.";

/** Postgres unique-violation code raised by the friendships pair index. */
const UNIQUE_VIOLATION = "23505";

export async function getSupabaseAndUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError("UNAUTHORIZED", SIGN_IN_MESSAGE, { cause: error });
  }

  return { supabase, userId: user.id };
}

/**
 * Case-insensitive username prefix search through `search_profiles`, which is
 * the only read path to profiles that are not accepted friends yet.
 * An empty query returns an empty list without touching the network.
 */
export async function searchProfiles(
  query: string,
): Promise<ApiResponse<FriendProfile[]>> {
  const normalized = normalizeSearchQuery(query);

  if (normalized === null) {
    return apiOk<FriendProfile[]>([]);
  }

  try {
    const { supabase } = await getSupabaseAndUser();
    const { data, error } = await supabase.rpc("search_profiles", {
      p_query: normalized,
    });

    if (error) {
      throw new AppError("INTERNAL", SEARCH_FAILED_MESSAGE, { cause: error });
    }

    return apiOk((data ?? []).map(mapProfileRow));
  } catch (error) {
    return apiFail<FriendProfile[]>(error, SEARCH_FAILED_MESSAGE);
  }
}

/** Accepted friends plus incoming and outgoing pending requests. */
export async function listMyFriendships(): Promise<ApiResponse<GroupedFriendships>> {
  try {
    const { supabase } = await getSupabaseAndUser();
    const { data, error } = await supabase.rpc("list_my_friendships", {});

    if (error) {
      throw new AppError("INTERNAL", LIST_FAILED_MESSAGE, { cause: error });
    }

    return apiOk(groupFriendships(data ?? []));
  } catch (error) {
    return apiFail<GroupedFriendships>(error, LIST_FAILED_MESSAGE);
  }
}

/** Inserts the pending row that both request paths share. */
async function insertFriendRequest(
  supabase: SupabaseClient<Database>,
  requesterId: string,
  addresseeId: string,
): Promise<void> {
  const { error } = await supabase.from("friendships").insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: "pending",
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new AppError(
        "CONFLICT",
        "توجد صداقة أو طلب صداقة مع هذا المستخدم بالفعل.",
        { cause: error },
      );
    }

    throw new AppError("INTERNAL", REQUEST_FAILED_MESSAGE, { cause: error });
  }
}

/** Creates a pending request from the signed-in user to `addresseeId`. */
export async function sendFriendRequest(
  addresseeId: string,
): Promise<ApiResponse<null>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();

    if (addresseeId === userId) {
      throw new AppError("BAD_REQUEST", "لا يمكنك إرسال طلب صداقة لنفسك.");
    }

    await insertFriendRequest(supabase, userId, addresseeId);

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, REQUEST_FAILED_MESSAGE);
  }
}

/**
 * Resolves a shareable friend code through the security-definer RPC (the
 * profiles RLS policy cannot expose strangers directly), then sends the same
 * pending request used by the search flow.
 */
export async function addFriendByCode(
  code: string,
): Promise<ApiResponse<FriendProfile>> {
  const normalized = normalizeFriendCode(code);

  if (!normalized) {
    return apiFail<FriendProfile>(
      new AppError("BAD_REQUEST", INVALID_CODE_MESSAGE),
      ADD_BY_CODE_FAILED_MESSAGE,
    );
  }

  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const { data, error } = await supabase.rpc("find_profile_by_friend_code", {
      p_code: normalized,
    });

    if (error) {
      throw new AppError("INTERNAL", ADD_BY_CODE_FAILED_MESSAGE, { cause: error });
    }

    const row = (data ?? [])[0];

    if (!row) {
      throw new AppError("NOT_FOUND", UNKNOWN_CODE_MESSAGE);
    }

    if (row.id === userId) {
      throw new AppError("BAD_REQUEST", OWN_CODE_MESSAGE);
    }

    const profile = mapProfileRow(row);
    await insertFriendRequest(supabase, userId, profile.id);

    return apiOk(profile);
  } catch (error) {
    return apiFail<FriendProfile>(error, ADD_BY_CODE_FAILED_MESSAGE);
  }
}

/** Reads the signed-in user's shareable code from their own profile. */
export async function getMyFriendCode(): Promise<ApiResponse<string>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const { data, error } = await supabase
      .from("profiles")
      .select("friend_code")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", CODE_LOAD_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", "لم يتم العثور على ملفك الشخصي.");
    }

    return apiOk(data.friend_code);
  } catch (error) {
    return apiFail<string>(error, CODE_LOAD_FAILED_MESSAGE);
  }
}

/** Replaces the signed-in user's code with a fresh unused one. */
export async function regenerateMyFriendCode(): Promise<ApiResponse<string>> {
  try {
    const { supabase } = await getSupabaseAndUser();
    const { data, error } = await supabase.rpc("regenerate_my_friend_code", {});

    if (error || !data) {
      throw new AppError("INTERNAL", REGENERATE_CODE_FAILED_MESSAGE, {
        cause: error,
      });
    }

    return apiOk(data);
  } catch (error) {
    return apiFail<string>(error, REGENERATE_CODE_FAILED_MESSAGE);
  }
}

/** Accepts an incoming request. Only the addressee's RLS policy allows this. */
export async function acceptFriendRequest(
  friendshipId: string,
): Promise<ApiResponse<null>> {
  try {
    const { supabase } = await getSupabaseAndUser();
    const { data, error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", ACCEPT_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError(
        "NOT_FOUND",
        "لم يتم العثور على طلب الصداقة أو لا تملك صلاحية قبوله.",
      );
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, ACCEPT_FAILED_MESSAGE);
  }
}

/** Deletes a friendship or cancels/declines a pending request. */
export async function removeFriendship(
  friendshipId: string,
): Promise<ApiResponse<null>> {
  try {
    const { supabase } = await getSupabaseAndUser();
    const { data, error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", REMOVE_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", "لم يتم العثور على الصداقة.");
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, REMOVE_FAILED_MESSAGE);
  }
}
