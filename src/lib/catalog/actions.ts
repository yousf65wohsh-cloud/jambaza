"use client";

import { apiFail, apiOk } from "@/lib/api/result";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { ApiResponse } from "@/types/api";

import { getTrack } from "./data";
import { isTrackId, MAX_COMMENT_LENGTH, normalizeComment, normalizeRating } from "./validation";

const SUBMIT_FAILED = "تعذّر إرسال التقييم. حاول مرة أخرى.";

/**
 * Saves the signed-in user's 1..5 rating and, when provided, a comment.
 * Rating and comment are submitted together from the track page form.
 */
export async function submitTrackFeedback(
  trackId: string,
  rating: number,
  comment: string,
): Promise<ApiResponse<null>> {
  try {
    if (!isTrackId(trackId)) {
      throw new AppError("BAD_REQUEST", "معرّف الأغنية غير صالح.");
    }

    const normalizedRating = normalizeRating(rating);

    if (normalizedRating === null) {
      throw new AppError("BAD_REQUEST", "اختر تقييماً من 1 إلى 5.");
    }

    const body = normalizeComment(comment);

    if (body === null) {
      throw new AppError("BAD_REQUEST", `يجب ألا يتجاوز التعليق ${MAX_COMMENT_LENGTH} حرفاً.`);
    }

    const trackResult = await getTrack(trackId);

    if (!trackResult.ok) {
      throw new AppError("INTERNAL", trackResult.error.message);
    }

    if (!trackResult.data) {
      throw new AppError("NOT_FOUND", "لم يتم العثور على الأغنية.");
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AppError(
        "UNAUTHORIZED",
        "يجب تسجيل الدخول لإرسال تقييم. سجّل الدخول ثم أعد المحاولة.",
        { cause: authError },
      );
    }

    const { error: ratingError } = await supabase.from("track_ratings").upsert(
      {
        track_id: trackId,
        user_id: user.id,
        rating: normalizedRating,
      },
      { onConflict: "track_id,user_id" },
    );

    if (ratingError) {
      throw new AppError("INTERNAL", SUBMIT_FAILED, { cause: ratingError });
    }

    if (body) {
      const { error: commentError } = await supabase.from("track_comments").insert({
        track_id: trackId,
        user_id: user.id,
        body,
      });

      if (commentError) {
        throw new AppError("INTERNAL", "تم حفظ تقييمك، لكن تعذّر إضافة التعليق. حاول مرة أخرى.", {
          cause: commentError,
        });
      }
    }

    return apiOk(null);
  } catch (error) {
    return apiFail<null>(error, SUBMIT_FAILED);
  }
}
