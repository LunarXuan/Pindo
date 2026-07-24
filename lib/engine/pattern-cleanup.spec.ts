import { describe, expect, it } from 'vitest';
import type { BeadCell } from '@/lib/types/bead';
import { removeIsolatedNoise } from './pattern-cleanup';

function buildCells(rows: string[]): BeadCell[][] {
  return rows.map(row => row.split('').map(colorId => ({ colorId })));
}

function dumpCells(cells: BeadCell[][]): string[] {
  return cells.map(row => row.map(cell => cell.colorId).join(''));
}

describe('removeIsolatedNoise', () => {
  it('replaces tiny isolated components with dominant neighbor color', () => {
    const cells = buildCells([
      'AAAAA',
      'ABACC',
      'AAACC',
      'DDAAA',
      'DDAEA',
    ]);

    const cleaned = removeIsolatedNoise(cells, 5, 5, 2);
    const out = dumpCells(cleaned);

    expect(out).toEqual([
      'AAAAA',
      'AAACC',
      'AAACC',
      'DDAAA',
      'DDAAA',
    ]);
  });

  it('keeps larger connected regions untouched', () => {
    const cells = buildCells([
      'AAAAAA',
      'AABBAA',
      'AABBAA',
      'AAAAAA',
    ]);

    const cleaned = removeIsolatedNoise(cells, 6, 4, 2);
    expect(dumpCells(cleaned)).toEqual([
      'AAAAAA',
      'AABBAA',
      'AABBAA',
      'AAAAAA',
    ]);
  });

  it('does not remove protected key colors', () => {
    const cells = buildCells([
      'AAAAA',
      'AABAA',
      'AAAAA',
    ]);
    const cleaned = removeIsolatedNoise(cells, 5, 3, 2, new Set(['B']));
    expect(dumpCells(cleaned)).toEqual([
      'AAAAA',
      'AABAA',
      'AAAAA',
    ]);
  });

  it('preserves tiny high-contrast details when luma map is provided', () => {
    const cells = buildCells([
      'WWWWW',
      'WWBWW',
      'WWWWW',
    ]);
    const luma = new Map<string, number>([
      ['W', 240],
      ['B', 15],
    ]);
    const cleaned = removeIsolatedNoise(cells, 5, 3, 2, new Set(), luma);
    expect(dumpCells(cleaned)).toEqual([
      'WWWWW',
      'WWBWW',
      'WWWWW',
    ]);
  });
});
