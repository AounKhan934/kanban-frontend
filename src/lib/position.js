// Computes a position for a card being inserted at `index` among
// `sortedCards` (already sorted by position, ascending, and NOT including
// the card being moved). Mirrors the 1000-gap scheme the backend's
// card.service.js uses for getNextPosition(), so cards created purely via
// REST/socket defaults still sort in sensibly with drag-and-drop inserts.
export function positionForInsert(sortedCards, index) {
  const GAP = 1000;

  if (sortedCards.length === 0) return GAP;

  if (index <= 0) {
    const first = sortedCards[0].position;
    return first - GAP > 0 ? first - GAP : first / 2;
  }

  if (index >= sortedCards.length) {
    return sortedCards[sortedCards.length - 1].position + GAP;
  }

  const before = sortedCards[index - 1].position;
  const after = sortedCards[index].position;
  return (before + after) / 2;
}
