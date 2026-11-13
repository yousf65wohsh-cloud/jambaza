"use client";

import { apiFail, apiOk } from "@/lib/api/result";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { ApiResponse } from "@/types/api";

import {
  groupFriendships,
  mapProfileRow,
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

/** Postgres unique-violation code raised by the friendships pair index. */
const UNIQUE_VIOLATION = "23505";

async function getSupabaseAndUser() {
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

/** Creates a pending request from the signed-in user to `addresseeId`. */
export async function sendFriendRequest(
  addresseeId: string,
): Promise<ApiResponse<null>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();

    if (addresseeId === userId) {
      throw new AppError("BAD_REQUEST", "لا يمكنك إرسال طلب صداقة لنفسك.");
    }

    const { error } = await supabase.from("friendships").insert({
      requester_id: userId,
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

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, REQUEST_FAILED_MESSAGE);
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
