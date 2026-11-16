/**
 * Returns the next append position for a playlist.
 *
 * Positions are zero-based and contiguous for new playlists, but removing a
 * track can leave gaps. Appending after the current maximum keeps the order
 * stable without renumbering existing rows.
 */
export function nextPosition(positions: number[]): number {
  if (positions.length === 0) {
    return 0;
  }

  return Math.max(...positions) + 1;
}
