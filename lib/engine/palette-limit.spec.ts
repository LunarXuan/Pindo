import { describe, expect, it } from 'vitest';
import type { CompiledBeadColor } from '@/lib/types/bead';
import { buildUsageMap, limitPaletteWithKeyColors, selectKeyColorIds } from './palette-limit';

function bead(id: string, rgb: [number, number, number]): CompiledBeadColor {
  return {
    id,
    brand: 'perler',
    code: id.toUpperCase(),
    name: id,
    hex: '#000000',
    rgb,
    lab: [0, 0, 0],
    source: 'test',
    license: 'test',
  };
}

describe('palette-limit', () => {
  it('keeps darkest and lightest key colors when limiting', () => {
    const palette = [
      bead('dark', [20, 20, 20]),
      bead('midA', [120, 120, 120]),
      bead('midB', [150, 140, 130]),
      bead('light', [240, 240, 240]),
      bead('accent', [220, 40, 60]),
    ];
    const matched: CompiledBeadColor[] = [
      ...Array(20).fill(palette[1]),
      ...Array(18).fill(palette[2]),
      ...Array(3).fill(palette[0]),
      ...Array(2).fill(palette[3]),
      palette[4],
    ];
    const usage = buildUsageMap(matched);
    const { limitedPalette } = limitPaletteWithKeyColors(palette, usage, 3);
    const ids = new Set(limitedPalette.map(color => color.id));
    expect(ids.has('dark')).toBe(true);
    expect(ids.has('light')).toBe(true);
  });

  it('returns used colors only when usage count is already below limit', () => {
    const palette = [bead('a', [10, 10, 10]), bead('b', [200, 200, 200]), bead('c', [100, 30, 40])];
    const usage = new Map<string, number>([
      ['a', 10],
      ['b', 3],
    ]);
    const { limitedPalette } = limitPaletteWithKeyColors(palette, usage, 2);
    expect(limitedPalette.map(color => color.id)).toEqual(['a', 'b']);
  });

  it('selects stable key colors from usage map', () => {
    const palette = [
      bead('dark', [10, 10, 10]),
      bead('light', [250, 250, 250]),
      bead('sat', [200, 30, 20]),
      bead('mid', [120, 120, 120]),
    ];
    const usage = new Map<string, number>([
      ['dark', 5],
      ['light', 4],
      ['sat', 3],
      ['mid', 10],
    ]);
    const keys = selectKeyColorIds(palette, usage);
    expect(keys.has('dark')).toBe(true);
    expect(keys.has('light')).toBe(true);
  });
});
