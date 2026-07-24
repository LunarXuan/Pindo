import type { BeadPattern, CompiledBeadColor } from '@/lib/types/bead';

const ROWS_PER_CHUNK = 8;
const MAX_CANVAS_DIM = 16384;
const MAX_CANVAS_PIXELS = 268435456; // 256M
const BOARD_SIZE = 29;
const BORDER_COLOR = '#6870B8'; // blue-purple border
const SUB_GRID = 5; // thicker line every N cells

function yieldFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => r()));
}

export async function renderPatternToCanvas(
  pattern: BeadPattern,
  palette: CompiledBeadColor[],
  cellSize: number = 20,
  showGrid: boolean = true,
  showCodes: boolean = false,
  onProgress?: (pct: number) => void,
): Promise<HTMLCanvasElement> {
  const { width, height } = pattern.metadata;
  // Clamp cellSize to stay within browser canvas limits
  const maxByDim = Math.floor(MAX_CANVAS_DIM / Math.max(width, height));
  const maxByPixels = Math.floor(Math.sqrt(MAX_CANVAS_PIXELS / (width * height)));
  cellSize = Math.min(cellSize, maxByDim, maxByPixels);

  const colorMap = new Map(palette.map(c => [c.id, c]));

  // Collect used colors for legend
  const usedColors = getUsedColorUsage(pattern, colorMap);

  // Layout dimensions
  const borderW = Math.max(2, Math.round(cellSize * 0.4));
  const gridW = width * cellSize;
  const gridH = height * cellSize;
  const totalW = gridW + borderW * 2;
  const legendLayout = getLegendLayout(usedColors, totalW, borderW, cellSize);
  const legendH = usedColors.length > 0 ? legendLayout.height : 0;
  const totalH = gridH + borderW * 2 + legendH;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;

  // Fill background white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalW, totalH);

  const font = `${Math.max(8, cellSize * 0.35)}px monospace`;
  const ox = borderW, oy = borderW;

  // Draw cells
  for (let y0 = 0; y0 < height; y0 += ROWS_PER_CHUNK) {
    const yEnd = Math.min(y0 + ROWS_PER_CHUNK, height);
    for (let y = y0; y < yEnd; y++) {
      for (let x = 0; x < width; x++) {
        const cell = pattern.cells[y][x];
        const color = colorMap.get(cell.colorId);
        const px = ox + x * cellSize, py = oy + y * cellSize;
        ctx.fillStyle = color?.hex ?? '#FF00FF';
        ctx.fillRect(px, py, cellSize, cellSize);
        if (showGrid) {
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, cellSize, cellSize);
        }
        if (showCodes && color && cellSize >= 16) {
          ctx.fillStyle = luminance(color.rgb) > 0.5 ? '#000' : '#FFF';
          ctx.font = font;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(color.code, px + cellSize / 2, py + cellSize / 2);
        }
      }
    }
    onProgress?.(Math.round(yEnd / height * 90));
    if (y0 + ROWS_PER_CHUNK < height) await yieldFrame();
  }

  // Sub-grid lines (every SUB_GRID cells) + Board separator lines
  if (showGrid) {
    // Sub-grid lines (medium thickness)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = Math.max(1, cellSize * 0.04);
    for (let bx = SUB_GRID; bx < width; bx += SUB_GRID) {
      if (bx % BOARD_SIZE === 0) continue; // skip board lines
      const px = ox + bx * cellSize;
      ctx.beginPath();
      ctx.moveTo(px, oy);
      ctx.lineTo(px, oy + gridH);
      ctx.stroke();
    }
    for (let by = SUB_GRID; by < height; by += SUB_GRID) {
      if (by % BOARD_SIZE === 0) continue;
      const py = oy + by * cellSize;
      ctx.beginPath();
      ctx.moveTo(ox, py);
      ctx.lineTo(ox + gridW, py);
      ctx.stroke();
    }

    // Board separator lines (thickest)
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = Math.max(2, cellSize * 0.08);
    // Vertical board lines
    for (let bx = 0; bx <= width; bx += BOARD_SIZE) {
      const px = ox + Math.min(bx, width) * cellSize;
      ctx.beginPath();
      ctx.moveTo(px, oy);
      ctx.lineTo(px, oy + gridH);
      ctx.stroke();
    }
    // Horizontal board lines
    for (let by = 0; by <= height; by += BOARD_SIZE) {
      const py = oy + Math.min(by, height) * cellSize;
      ctx.beginPath();
      ctx.moveTo(ox, py);
      ctx.lineTo(ox + gridW, py);
      ctx.stroke();
    }
  }

  // Blue-purple border
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = borderW;
  ctx.strokeRect(borderW / 2, borderW / 2, totalW - borderW, gridH + borderW);

  // Required bead colors/count legend at bottom
  if (legendH > 0) {
    const legendTop = oy + gridH + borderW + legendLayout.paddingTop;
    ctx.font = `bold ${legendLayout.fontPx}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < usedColors.length; i++) {
      const item = usedColors[i];
      const col = i % legendLayout.columns;
      const row = Math.floor(i / legendLayout.columns);
      const x = borderW + legendLayout.gap + col * (legendLayout.chipW + legendLayout.gap);
      const y = legendTop + row * (legendLayout.chipH + legendLayout.gap);
      const radius = Math.max(4, Math.round(legendLayout.chipH * 0.18));
      const label = `${item.color.code}（${item.count}）`;

      roundRect(ctx, x, y, legendLayout.chipW, legendLayout.chipH, radius);
      ctx.fillStyle = item.color.hex;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = luminance(item.color.rgb) > 0.58 ? '#111827' : '#FFFFFF';
      ctx.fillText(label, x + legendLayout.chipW / 2, y + legendLayout.chipH / 2);
    }
  }

  onProgress?.(100);
  return canvas;
}

interface UsedColor {
  color: CompiledBeadColor;
  count: number;
}

function getUsedColorUsage(
  pattern: BeadPattern,
  colorMap: Map<string, CompiledBeadColor>,
): UsedColor[] {
  const counts = new Map<string, number>();
  for (const row of pattern.cells)
    for (const cell of row)
      counts.set(cell.colorId, (counts.get(cell.colorId) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => {
      const color = colorMap.get(id);
      return color ? { color, count } : null;
    })
    .filter((c): c is UsedColor => !!c)
    .sort((a, b) => a.color.code.localeCompare(b.color.code, 'zh-Hans-CN', { numeric: true }) || b.count - a.count);
}

function getLegendLayout(usedColors: UsedColor[], totalW: number, borderW: number, cellSize: number) {
  const fontPx = Math.max(14, Math.round(cellSize * 0.3));
  const gap = Math.max(6, Math.round(cellSize * 0.14));
  const chipH = Math.max(28, Math.round(fontPx * 1.85));
  const usableW = Math.max(1, totalW - borderW * 2 - gap * 2);
  const longest = usedColors.reduce((m, item) => Math.max(m, `${item.color.code}（${item.count}）`.length), 6);
  const minChipW = Math.max(Math.round(cellSize * 2.2), Math.round(longest * fontPx * 0.62 + fontPx * 1.6));
  const columns = Math.max(1, Math.floor((usableW + gap) / (minChipW + gap)));
  const chipW = Math.floor((usableW - gap * (columns - 1)) / columns);
  const rows = Math.ceil(usedColors.length / columns);
  const paddingTop = Math.max(10, Math.round(cellSize * 0.25));
  const paddingBottom = Math.max(12, Math.round(cellSize * 0.28));
  return {
    columns,
    chipW,
    chipH,
    gap,
    fontPx,
    paddingTop,
    height: paddingTop + rows * chipH + Math.max(0, rows - 1) * gap + paddingBottom,
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function luminance(rgb: [number, number, number]): number {
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')), 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
