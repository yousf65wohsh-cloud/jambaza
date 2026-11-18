"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { apiFail, apiOk } from "@/lib/api/result";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { buildAvatarPath, parsePublicStoragePath } from "@/lib/upload/paths";
import {
  getPublicCoverUrl,
  removeStorageFilesBestEffort,
  uploadFileToStorage,
} from "@/lib/upload/storage";
import { validateCoverFile } from "@/lib/upload/validation";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database";

import {
  normalizeDisplayName,
  validateDisplayName,
  validateNewPassword,
} from "./validation";

const SIGN_IN_MESSAGE = "يجب تسجيل الدخول لعرض حسابك. سجّل الدخول ثم أعد المحاولة.";
const LOAD_FAILED_MESSAGE = "تعذّر تحميل بيانات حسابك. حاول مرة أخرى.";
const SAVE_FAILED_MESSAGE = "تعذّر حفظ التغييرات. حاول مرة أخرى.";
const PASSWORD_FAILED_MESSAGE = "تعذّر تغيير كلمة المرور. حاول مرة أخرى.";
const MISSING_PROFILE_MESSAGE = "لم يتم العثور على ملفك الشخصي. أعد تسجيل الدخول.";

const PROFILE_COLUMNS = "id, username, display_name, avatar_url";

/** The signed-in user's own editable profile fields. */
export interface AccountProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface SaveAccountInput {
  displayName: string;
  /** Optional new avatar. Validated with the same rules as track covers. */
  avatarFile: File | null;
}

type AccountRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "username" | "display_name" | "avatar_url"
>;

function mapAccountRow(row: AccountRow): AccountProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
}

async function getSupabaseAndUser(): Promise<{
  supabase: SupabaseClient<Database>;
  userId: string;
}> {
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

/** Reads only the editable columns; role and friend_code never leave the DB. */
export async function getMyAccount(): Promise<ApiResponse<AccountProfile>> {
  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", LOAD_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", MISSING_PROFILE_MESSAGE);
    }

    return apiOk(mapAccountRow(data));
  } catch (error) {
    return apiFail<AccountProfile>(error, LOAD_FAILED_MESSAGE);
  }
}

function appendCacheBuster(url: string): string {
  return `${url}?v=${Date.now()}`;
}

/**
 * Saves the display name and, when provided, uploads a new avatar directly
 * from the browser to `covers/{owner_id}/avatar.{ext}` before updating the
 * profile row. The previous avatar is removed when its extension changed.
 */
export async function saveMyAccount(
  input: SaveAccountInput,
): Promise<ApiResponse<AccountProfile>> {
  const displayNameValidation = validateDisplayName(input.displayName);

  if (!displayNameValidation.ok) {
    return apiFail<AccountProfile>(
      new AppError("BAD_REQUEST", displayNameValidation.message),
      SAVE_FAILED_MESSAGE,
    );
  }

  let uploadedPath: string | null = null;
  let previousAvatarPath: string | null = null;

  try {
    const { supabase, userId } = await getSupabaseAndUser();
    const displayName = normalizeDisplayName(input.displayName);

    const { data: current, error: currentError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (currentError) {
      throw new AppError("INTERNAL", SAVE_FAILED_MESSAGE, { cause: currentError });
    }

    if (!current) {
      throw new AppError("NOT_FOUND", MISSING_PROFILE_MESSAGE);
    }

    previousAvatarPath = current.avatar_url
      ? parsePublicStoragePath(current.avatar_url, "covers")
      : null;

    let avatarUrl: string | null = null;

    if (input.avatarFile) {
      const avatarValidation = validateCoverFile(input.avatarFile);

      if (!avatarValidation.ok) {
        throw new AppError("BAD_REQUEST", avatarValidation.message);
      }

      const path = buildAvatarPath(userId, avatarValidation.extension);
      await uploadFileToStorage({
        bucket: "covers",
        path,
        file: input.avatarFile,
        upsert: true,
      });

      uploadedPath = path;
      avatarUrl = appendCacheBuster(getPublicCoverUrl(path));
    }

    const updates: Database["public"]["Tables"]["profiles"]["Update"] = {
      display_name: displayName,
    };

    if (avatarUrl) {
      updates.avatar_url = avatarUrl;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", SAVE_FAILED_MESSAGE, { cause: error });
    }

    if (!data) {
      throw new AppError("NOT_FOUND", MISSING_PROFILE_MESSAGE);
    }

    if (uploadedPath && previousAvatarPath && previousAvatarPath !== uploadedPath) {
      await removeStorageFilesBestEffort([
        { bucket: "covers", path: previousAvatarPath },
      ]);
    }

    return apiOk(mapAccountRow(data));
  } catch (error) {
    // Keep the old avatar untouched when the upload overwrote the same object.
    if (uploadedPath && uploadedPath !== previousAvatarPath) {
      await removeStorageFilesBestEffort([{ bucket: "covers", path: uploadedPath }]);
    }

    return apiFail<AccountProfile>(error, SAVE_FAILED_MESSAGE);
  }
}

/** Changes the signed-in user's password after an independent length check. */
export async function changeMyPassword(
  password: string,
): Promise<ApiResponse<null>> {
  const validation = validateNewPassword(password);

  if (!validation.ok) {
    return apiFail<null>(
      new AppError("BAD_REQUEST", validation.message),
      PASSWORD_FAILED_MESSAGE,
    );
  }

  try {
    const { error } = await createClient().auth.updateUser({ password });

    if (error) {
      throw new AppError(
        "INTERNAL",
        getAuthErrorMessage(error, PASSWORD_FAILED_MESSAGE),
        { cause: error },
      );
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, PASSWORD_FAILED_MESSAGE);
  }
}
