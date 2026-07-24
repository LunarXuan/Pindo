import type { CompiledBeadColor } from '@/lib/types/bead';

export function buildUsageMap(matched: CompiledBeadColor[]): Map<string, number> {
  const usage = new Map<string, number>();
  for (const color of matched) {
    usage.set(color.id, (usage.get(color.id) ?? 0) + 1);
  }
  return usage;
}

export function selectKeyColorIds(palette: CompiledBeadColor[], usage: Map<string, number>): Set<string> {
  const used = palette.filter(color => (usage.get(color.id) ?? 0) > 0);
  if (used.length === 0) return new Set<string>();

  const keys = new Set<string>();

  // 最暗色和最亮色从整个调色板中选（确保描边色即使未被匹配到也被保护）
  const byLuma = [...palette].sort((a, b) => luminance(a) - luminance(b));
  keys.add(byLuma[0].id);
  keys.add(byLuma[byLuma.length - 1].id);

  // 最高饱和度色从 used 中选
  const minUsage = used.some(color => (usage.get(color.id) ?? 0) >= 2) ? 2 : 1;
  const stable = used.filter(color => (usage.get(color.id) ?? 0) >= minUsage);
  const pool = stable.length > 0 ? stable : used;

  let bestSatColor: CompiledBeadColor | null = null;
  let bestSatScore = -1;
  for (const color of pool) {
    const sat = saturation(color);
    const count = usage.get(color.id) ?? 0;
    const score = sat * 10 + count;
    if (score > bestSatScore) {
      bestSatScore = score;
      bestSatColor = color;
    }
  }
  if (bestSatColor && saturation(bestSatColor) >= 28) keys.add(bestSatColor.id);

  return keys;
}

export function limitPaletteWithKeyColors(
  palette: CompiledBeadColor[],
  usage: Map<string, number>,
  maxColors: number
): { limitedPalette: CompiledBeadColor[]; protectedIds: Set<string> } {
  if (maxColors <= 0 || maxColors >= palette.length) {
    return { limitedPalette: palette, protectedIds: new Set<string>() };
  }

  const used = palette.filter(color => (usage.get(color.id) ?? 0) > 0);
  const protectedIds = selectKeyColorIds(palette, usage);
  if (used.length <= maxColors) {
    const usedIds = new Set(used.map(color => color.id));
    const finalProtected = new Set([...protectedIds].filter(id => usedIds.has(id)));
    return {
      limitedPalette: palette.filter(color => usedIds.has(color.id)),
      protectedIds: finalProtected,
    };
  }

  const selected = new Set(
    [...used]
      .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0))
      .slice(0, maxColors)
      .map(color => color.id)
  );

  for (const id of protectedIds) selected.add(id);

  while (selected.size > maxColors) {
    // Prefer removing muddy grays (low saturation, mid luma) first
    let removeId: string | null = null;
    let worstScore = Infinity;
    for (const id of selected) {
      if (protectedIds.has(id)) continue;
      const color = palette.find(c => c.id === id);
      if (!color) continue;
      const count = usage.get(id) ?? 0;
      const sat = saturation(color);
      const luma = luminance(color);
      const isGray = sat < 30 && luma > 50 && luma < 220;
      // Gray colors get a penalty (lower score = removed first)
      const score = count + (isGray ? 0 : 10000);
      if (score < worstScore) {
        worstScore = score;
        removeId = id;
      }
    }

    if (!removeId) {
      const trimmed = [...selected]
        .sort((a, b) => (usage.get(b) ?? 0) - (usage.get(a) ?? 0))
        .slice(0, maxColors);
      selected.clear();
      for (const id of trimmed) selected.add(id);
      break;
    }
    selected.delete(removeId);
  }

  const finalProtected = new Set([...protectedIds].filter(id => selected.has(id)));
  return {
    limitedPalette: palette.filter(color => selected.has(color.id)),
    protectedIds: finalProtected,
  };
}

function luminance(color: CompiledBeadColor): number {
  return 0.2126 * color.rgb[0] + 0.7152 * color.rgb[1] + 0.0722 * color.rgb[2];
}

function saturation(color: CompiledBeadColor): number {
  const [r, g, b] = color.rgb;
  return Math.max(r, g, b) - Math.min(r, g, b);
}
