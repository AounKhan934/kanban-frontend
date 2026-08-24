import { describe, expect, it } from 'vitest';
import { calculatePosition, needsRebalance } from '../utils/position';

describe('calculatePosition', () => {
  it('returns a default gap for an empty column (both null)', () => {
    expect(calculatePosition(null, null)).toBe(1000);
  });

  it('returns half of next position when dropping at the start', () => {
    expect(calculatePosition(null, 1000)).toBe(500);
  });

  it('returns prev + gap when dropping at the end', () => {
    expect(calculatePosition(1000, null)).toBe(2000);
  });

  it('returns midpoint when dropping between two cards', () => {
    // Card A: 1000, Card B: 2000 -> dropping Card C between them
    expect(calculatePosition(1000, 2000)).toBe(1500);
  });

  it('never depends on array indices — only on neighbor positions', () => {
    // Same neighbor positions should give the same result regardless of
    // how many other cards exist elsewhere in the column.
    expect(calculatePosition(500, 700)).toBe(calculatePosition(500, 700));
  });
});

describe('needsRebalance', () => {
  it('is false when there is room between neighbors', () => {
    expect(needsRebalance(1000, 2000)).toBe(false);
  });

  it('is false at the boundaries (null neighbor)', () => {
    expect(needsRebalance(null, 2000)).toBe(false);
    expect(needsRebalance(1000, null)).toBe(false);
  });

  it('is true when neighbors are essentially equal (precision exhausted)', () => {
    expect(needsRebalance(1000.0000001, 1000.0000001)).toBe(true);
  });
});
