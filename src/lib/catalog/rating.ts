/**
 * Returns the average of the given ratings, rounded to one decimal place.
 * An empty list has no rating yet and resolves to 0.
 */
export function averageRating(ratings: number[]): number {
  if (ratings.length === 0) {
    return 0;
  }

  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return Math.round((total / ratings.length) * 10) / 10;
}
