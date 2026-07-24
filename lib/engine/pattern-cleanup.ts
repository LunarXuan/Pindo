import type { BeadCell } from '@/lib/types/bead';

function indexToCoord(index: number, width: number): [row: number, col: number] {
  return [Math.floor(index / width), index % width];
}

function coordToIndex(row: number, col: number, width: number): number {
  return row * width + col;
}

function neighbors4(row: number, col: number, width: number, height: number): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  if (row > 0) result.push([row - 1, col]);
  if (row + 1 < height) result.push([row + 1, col]);
  if (col > 0) result.push([row, col - 1]);
  if (col + 1 < width) result.push([row, col + 1]);
  return result;
}

/** 3×3 多数滤波：每格取 8 邻域+自身出现最多的颜色替换，描边格跳过。 */
export function majorityFilter(
  cells: BeadCell[][],
  width: number,
  height: number,
  strokeMask?: boolean[],
  minMajority: number = 6,
): BeadCell[][] {
  const output = cells.map(row => row.map(cell => ({ ...cell })));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (strokeMask && strokeMask[y * width + x]) continue;
      const counts = new Map<string, number>();
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const id = cells[ny][nx].colorId;
            counts.set(id, (counts.get(id) ?? 0) + 1);
          }
        }
      }
      let best = '', bestN = 0;
      for (const [id, n] of counts) { if (n > bestN) { best = id; bestN = n; } }
      if (bestN >= minMajority) output[y][x].colorId = best;
    }
  }
  return output;
}

export function removeIsolatedNoise(
  cells: BeadCell[][],
  width: number,
  height: number,
  minComponentSize: number = 2,
  protectedColorIds: Set<string> = new Set<string>(),
  colorLumaMap?: Map<string, number>,
  preserveHighContrastMask?: boolean[],
): BeadCell[][] {
  if (width <= 0 || height <= 0 || minComponentSize < 1) return cells;
  const preserveContrastThreshold = 42;

  const source = cells.map(row => row.map(cell => cell.colorId));
  const output = cells.map(row => row.map(cell => ({ ...cell })));
  const total = width * height;
  const visited = new Uint8Array(total);

  for (let start = 0; start < total; start++) {
    if (visited[start]) continue;

    const [startRow, startCol] = indexToCoord(start, width);
    const targetColor = source[startRow][startCol];
    const queue: number[] = [start];
    const component: number[] = [];
    visited[start] = 1;

    while (queue.length > 0) {
      const idx = queue.shift()!;
      component.push(idx);
      const [row, col] = indexToCoord(idx, width);

      for (const [nr, nc] of neighbors4(row, col, width, height)) {
        const nIdx = coordToIndex(nr, nc, width);
        if (visited[nIdx]) continue;
        if (source[nr][nc] !== targetColor) continue;
        visited[nIdx] = 1;
        queue.push(nIdx);
      }
    }

    if (component.length > minComponentSize) continue;
    if (protectedColorIds.has(targetColor)) continue;

    const neighborCount = new Map<string, number>();
    let maxContrast = 0;
    for (const idx of component) {
      const [row, col] = indexToCoord(idx, width);
      for (const [nr, nc] of neighbors4(row, col, width, height)) {
        const colorId = source[nr][nc];
        if (colorId === targetColor) continue;
        neighborCount.set(colorId, (neighborCount.get(colorId) ?? 0) + 1);
        if (colorLumaMap) {
          const sourceLuma = colorLumaMap.get(targetColor);
          const neighborLuma = colorLumaMap.get(colorId);
          if (sourceLuma !== undefined && neighborLuma !== undefined) {
            maxContrast = Math.max(maxContrast, Math.abs(sourceLuma - neighborLuma));
          }
        }
      }
    }

    if (neighborCount.size === 0) continue;
    if (maxContrast >= preserveContrastThreshold) {
      const shouldPreserve = preserveHighContrastMask
        ? component.some(idx => preserveHighContrastMask[idx])
        : true;
      if (shouldPreserve) continue;
    }

    let replaceColor = targetColor;
    let best = -1;
    for (const [colorId, count] of neighborCount.entries()) {
      if (count > best) {
        best = count;
        replaceColor = colorId;
      }
    }

    for (const idx of component) {
      const [row, col] = indexToCoord(idx, width);
      output[row][col].colorId = replaceColor;
    }
  }

  return output;
}
