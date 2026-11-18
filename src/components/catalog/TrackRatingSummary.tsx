import { StarIcon } from "@/components/ui/icons";
import { formatRatingCount } from "@/lib/catalog/format";
import { averageRating } from "@/lib/catalog/rating";

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

/** Average rating, star row, and count for a track. */
export function TrackRatingSummary({
  ratings,
  error,
}: {
  ratings: number[];
  error?: string | null;
}) {
  if (error) {
    return (
      <p role="alert" className="text-danger text-sm">
        {error}
      </p>
    );
  }

  const count = ratings.length;

  if (count === 0) {
    return <p className="text-muted text-sm">لا توجد تقييمات بعد — كن أول من يقيّم.</p>;
  }

  const average = averageRating(ratings);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="img"
        aria-label={`متوسط التقييم ${average.toFixed(1)} من 5`}
        className="flex items-center gap-0.5"
      >
        {RATING_VALUES.map((value) => (
          <StarIcon
            key={value}
            className={value <= Math.round(average) ? "text-accent size-4" : "text-border size-4"}
          />
        ))}
      </div>
      <span className="text-lg font-extrabold tabular-nums">{average.toFixed(1)}</span>
      <span className="text-muted text-sm">من 5 · {formatRatingCount(count)}</span>
    </div>
  );
}
