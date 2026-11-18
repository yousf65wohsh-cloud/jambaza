"use client";

import { useState, useTransition, type FormEvent } from "react";

import { submitTrackFeedback } from "@/lib/catalog/actions";
import { MAX_COMMENT_LENGTH } from "@/lib/catalog/validation";
import { cn } from "@/lib/utils";

import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StarIcon } from "../ui/icons";

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

export function FeedbackForm({
  trackId,
  initialRating,
  onSuccess,
}: {
  trackId: string;
  initialRating: number | null;
  onSuccess?: () => void;
}) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (rating === null) {
      setError("اختر تقييماً من 1 إلى 5.");
      return;
    }

    startTransition(async () => {
      const result = await submitTrackFeedback(trackId, rating, comment);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setSuccess(comment.trim() ? "تم حفظ تقييمك وتعليقك." : "تم حفظ تقييمك.");
      setComment("");
      onSuccess?.();
    });
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">قيّم هذه الأغنية</h2>
        <p className="text-muted text-sm leading-6">
          اختر تقييماً من 1 إلى 5، ويمكنك إضافة تعليق من {MAX_COMMENT_LENGTH} حرفاً كحد أقصى.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <fieldset disabled={isPending} className="space-y-2">
          <legend className="text-sm font-medium">تقييمك</legend>
          <div className="flex items-center gap-1">
            {RATING_VALUES.map((value) => {
              const selected = rating !== null && value <= rating;

              return (
                <label
                  key={value}
                  className={cn(
                    "cursor-pointer rounded-lg p-1 transition-colors",
                    selected ? "text-accent" : "text-border hover:text-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                    className="sr-only"
                  />
                  <StarIcon className="size-8" />
                  <span className="sr-only">{value} من 5</span>
                </label>
              );
            })}
            {rating !== null ? (
              <span className="text-muted ms-2 text-sm tabular-nums">{rating} من 5</span>
            ) : null}
          </div>
          {initialRating !== null ? (
            <p className="text-muted text-xs">تقييمك الحالي: {initialRating} من 5.</p>
          ) : null}
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor="feedback-comment" className="block text-sm font-medium">
            تعليق (اختياري)
          </label>
          <textarea
            id="feedback-comment"
            name="comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="شارك رأيك في الأغنية..."
            rows={3}
            maxLength={MAX_COMMENT_LENGTH}
            disabled={isPending}
            className="field resize-y"
          />
          <p className="text-muted text-xs tabular-nums">
            {comment.length} / {MAX_COMMENT_LENGTH}
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}

        {success ? (
          <p
            role="status"
            className="bg-success/10 border-success/30 text-success rounded-xl border px-3 py-2 text-sm"
          >
            {success}
          </p>
        ) : null}

        <Button type="submit" loading={isPending} disabled={isPending}>
          إرسال التقييم
        </Button>
      </form>
    </Card>
  );
}
