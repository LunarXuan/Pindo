import type { BeadPattern, BeadUsageItem, CompiledBeadColor } from '@/lib/types/bead';

export function calculateUsage(pattern: BeadPattern, palette: CompiledBeadColor[]): BeadUsageItem[] {
  const counts = new Map<string, number>();
  for (const row of pattern.cells) {
    for (const cell of row) {
      if (cell.isEmpty) continue;
      counts.set(cell.colorId, (counts.get(cell.colorId) || 0) + 1);
    }
  }

  const colorMap = new Map(palette.map(c => [c.id, c]));
  const items: BeadUsageItem[] = [];
  for (const [colorId, count] of counts) {
    const color = colorMap.get(colorId);
    if (color) items.push({ colorId, color, count });
  }

  return items.sort((a, b) => b.count - a.count);
}

export function totalBeads(usage: BeadUsageItem[]): number {
  return usage.reduce((sum, item) => sum + item.count, 0);
}

export function usageToCsv(usage: BeadUsageItem[]): string {
  const header = 'Code,Name,Hex,Count';
  const rows = usage.map(u => `${u.color.code},${u.color.name},${u.color.hex},${u.count}`);
  return [header, ...rows].join('\n');
}
