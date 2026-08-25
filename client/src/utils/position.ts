/**
 * Gap-based ("fractional indexing") position calculation.
 *
 * We NEVER use array indices as permanent ordering — indices shift every
 * time any card is inserted/removed, which breaks concurrent operations.
 * Instead each card gets a numeric `position`; to drop a card between two
 * neighbors we take the midpoint of their positions, leaving room for
 * future inserts without touching any other card.
 */

const DEFAULT_GAP = 1000;

/**
 * @param prevPosition position of the card immediately before the drop
 *   point, or null if dropping at the start of the column.
 * @param nextPosition position of the card immediately after the drop
 *   point, or null if dropping at the end of the column.
 */
export function calculatePosition(
  prevPosition: number | null,
  nextPosition: number | null
): number {
  if (prevPosition === null && nextPosition === null) {
    return DEFAULT_GAP;
  }
  if (prevPosition === null && nextPosition !== null) {
    return nextPosition / 2;
  }
  if (prevPosition !== null && nextPosition === null) {
    return prevPosition + DEFAULT_GAP;
  }
  // both defined
  return (prevPosition! + nextPosition!) / 2;
}

/** True once two adjacent positions get too close to safely bisect further
 * (floating point precision limit). Callers can use this to trigger a
 * full-column "rebalance" (server-side) — out of scope for Member 4, but
 * flagged here so the situation is at least detectable on the client. */
export function needsRebalance(prevPosition: number | null, nextPosition: number | null): boolean {
  if (prevPosition === null || nextPosition === null) return false;
  return Math.abs(nextPosition - prevPosition) < 1e-6;
}

