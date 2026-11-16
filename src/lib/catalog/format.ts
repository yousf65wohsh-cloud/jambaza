const releaseDateFormatter = new Intl.DateTimeFormat("ar", {
  dateStyle: "long",
  timeZone: "UTC",
});

const feedbackDateFormatter = new Intl.DateTimeFormat("ar", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Formats a `date` column (YYYY-MM-DD) without shifting the day in any timezone. */
export function formatReleaseDate(value: string | null): string {
  if (!value) {
    return "غير متوفر";
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return releaseDateFormatter.format(date);
}

/** Formats a comment timestamp for the RTL interface. */
export function formatFeedbackDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return feedbackDateFormatter.format(date);
}

/** Arabic-aware plural label for the number of track ratings. */
export function formatRatingCount(count: number): string {
  if (count <= 0) {
    return "لا توجد تقييمات";
  }

  if (count === 1) {
    return "تقييم واحد";
  }

  if (count === 2) {
    return "تقييمان";
  }

  if (count <= 10) {
    return `${count} تقييمات`;
  }

  return `${count} تقييماً`;
}
