import type { BeadCell, BeadPattern, CompiledBeadColor, BeadBrand } from '@/lib/types/bead';
import { matchColor } from './color-matcher';
import { downscale } from './downscaler';

interface Grid {
  xLines: number[];
  yLines: number[];
  w: number;
  h: number;
  source: 'auto' | 'manual';
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[clamp(Math.round((sorted.length - 1) * p), 0, sorted.length - 1)];
}

function imageToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('无法读取图片像素。'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片读取失败。'));
    };
    img.src = url;
  });
}

function cropImageDataToContent(imgData: ImageData): ImageData {
  const { width, height, data } = imgData;
  const cornerSamples: Rgb[] = [];
  const cornerSize = Math.max(2, Math.round(Math.min(width, height) * 0.025));
  const addCorner = (x0: number, y0: number) => {
    for (let y = y0; y < Math.min(height, y0 + cornerSize); y++) {
      for (let x = x0; x < Math.min(width, x0 + cornerSize); x++) {
        const o = (y * width + x) * 4;
        cornerSamples.push({ r: data[o], g: data[o + 1], b: data[o + 2] });
      }
    }
  };
  addCorner(0, 0);
  addCorner(Math.max(0, width - cornerSize), 0);
  addCorner(0, Math.max(0, height - cornerSize));
  addCorner(Math.max(0, width - cornerSize), Math.max(0, height - cornerSize));

  const bg: Rgb = {
    r: median(cornerSamples.map(p => p.r)),
    g: median(cornerSamples.map(p => p.g)),
    b: median(cornerSamples.map(p => p.b)),
  };

  let minX = width, minY = height, maxX = -1, maxY = -1;
  const threshold = 26;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const dr = data[o] - bg.r;
      const dg = data[o + 1] - bg.g;
      const db = data[o + 2] - bg.b;
      const diff = Math.sqrt(dr * dr + dg * dg + db * db);
      if (diff > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return imgData;
  const margin = Math.round(Math.min(width, height) * 0.01);
  minX = clamp(minX - margin, 0, width - 1);
  minY = clamp(minY - margin, 0, height - 1);
  maxX = clamp(maxX + margin, 0, width - 1);
  maxY = clamp(maxY + margin, 0, height - 1);
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  // Do not crop tiny margins; it is safer to preserve user-provided geometry.
  if (cropW > width * 0.94 && cropH > height * 0.94) return imgData;

  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return imgData;
  const cropped = ctx.createImageData(cropW, cropH);
  for (let y = 0; y < cropH; y++) {
    const src = ((minY + y) * width + minX) * 4;
    const dst = y * cropW * 4;
    cropped.data.set(data.subarray(src, src + cropW * 4), dst);
  }
  return cropped;
}

function buildLineScores(imgData: ImageData, axis: 'x' | 'y') {
  const { width, height, data } = imgData;
  const len = axis === 'x' ? width : height;
  const cross = axis === 'x' ? height : width;
  const scores = new Float32Array(len);

  for (let p = 1; p < len - 1; p++) {
    let score = 0;
    for (let q = 0; q < cross; q++) {
      const x = axis === 'x' ? p : q;
      const y = axis === 'x' ? q : p;
      const o = (y * width + x) * 4;
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const neutralDark = max < 215 && max - min < 90;

      const before = axis === 'x' ? o - 4 : o - width * 4;
      const after = axis === 'x' ? o + 4 : o + width * 4;
      const gray0 = 0.299 * data[before] + 0.587 * data[before + 1] + 0.114 * data[before + 2];
      const gray1 = 0.299 * r + 0.587 * g + 0.114 * b;
      const gray2 = 0.299 * data[after] + 0.587 * data[after + 1] + 0.114 * data[after + 2];
      const edge = Math.abs(gray1 - gray0) + Math.abs(gray2 - gray1);

      if (neutralDark) score += 0.85;
      if (edge > 20) score += 0.55;
    }
    scores[p] = score;
  }

  return scores;
}

function groupRuns(items: { pos: number; score: number }[]) {
  const runs: { pos: number; width: number; score: number }[] = [];
  let current: { pos: number; score: number }[] = [];
  for (const item of items) {
    if (!current.length || item.pos <= current[current.length - 1].pos + 1) {
      current.push(item);
    } else {
      runs.push(weightRun(current));
      current = [item];
    }
  }
  if (current.length) runs.push(weightRun(current));
  return runs;
}

function weightRun(run: { pos: number; score: number }[]) {
  const total = run.reduce((s, x) => s + x.score, 0) || 1;
  return {
    pos: Math.round(run.reduce((s, x) => s + x.pos * x.score, 0) / total),
    width: run[run.length - 1].pos - run[0].pos + 1,
    score: total,
  };
}

function linePeaks(scores: Float32Array) {
  const values = Array.from(scores);
  const maxScore = Math.max(...values);
  if (maxScore <= 0) return [];
  const threshold = Math.max(percentile(values, 0.88), maxScore * 0.18);
  const runs = [];
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] >= threshold) runs.push({ pos: i, score: scores[i] });
  }
  return groupRuns(runs).filter(r => r.width <= 10).sort((a, b) => a.pos - b.pos);
}

function stableLines(lines: number[]) {
  if (lines.length < 3) return false;
  const diffs: number[] = [];
  for (let i = 1; i < lines.length; i++) diffs.push(lines[i] - lines[i - 1]);
  const step = median(diffs);
  if (step < 6) return false;
  const tolerance = Math.max(3, step * 0.22);
  return diffs.filter(d => Math.abs(d - step) <= tolerance).length / diffs.length >= 0.82;
}

function findPeakNear(peaks: { pos: number; score: number }[], expected: number, tolerance: number) {
  let best: { pos: number; score: number } | null = null;
  let bestDist = Infinity;
  for (const peak of peaks) {
    const d = Math.abs(peak.pos - expected);
    if (d <= tolerance && d < bestDist) {
      best = peak;
      bestDist = d;
    }
  }
  return best;
}

function inferLines(scores: Float32Array) {
  const peaks = linePeaks(scores);
  if (peaks.length < 3) return null;

  const diffs: number[] = [];
  for (let i = 0; i < peaks.length; i++) {
    for (let j = i + 1; j < peaks.length; j++) {
      const d = peaks[j].pos - peaks[i].pos;
      if (d >= 6 && d <= 80) diffs.push(Math.round(d));
      if (d > 80) break;
    }
  }
  if (!diffs.length) return null;

  const buckets = new Map<number, number>();
  for (const d of diffs) buckets.set(d, (buckets.get(d) || 0) + 1);
  const stepCandidates = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([step]) => step);

  let best: { lines: number[]; score: number } | null = null;
  for (const step of stepCandidates) {
    const tolerance = Math.max(3, step * 0.22);
    for (const start of peaks) {
      const lines: number[] = [];
      let expected = start.pos;
      while (expected >= -tolerance) expected -= step;
      expected += step;
      while (expected <= scores.length - 1 + tolerance) {
        const peak = findPeakNear(peaks, expected, tolerance);
        lines.push(peak?.pos ?? Math.round(expected));
        expected += step;
      }
      const unique = [...new Set(lines.filter(v => v >= 0 && v < scores.length))].sort((a, b) => a - b);
      if (unique.length < 4 || !stableLines(unique)) continue;
      const strength = unique.reduce((s, p) => s + (scores[p] || 0), 0);
      const score = unique.length * 10000 + strength;
      if (!best || score > best.score) best = { lines: unique, score };
    }
  }

  return best?.lines ?? null;
}

function buildEvenGrid(imgData: ImageData, w: number, h: number): Grid {
  const xLines: number[] = [];
  const yLines: number[] = [];
  for (let x = 0; x <= w; x++) xLines.push(clamp(Math.round((imgData.width * x) / w), 0, imgData.width));
  for (let y = 0; y <= h; y++) yLines.push(clamp(Math.round((imgData.height * y) / h), 0, imgData.height));
  xLines[w] = imgData.width;
  yLines[h] = imgData.height;
  return { xLines, yLines, w, h, source: 'manual' };
}

function detectGrid(imgData: ImageData): Grid | null {
  const xLines = inferLines(buildLineScores(imgData, 'x'));
  const yLines = inferLines(buildLineScores(imgData, 'y'));
  if (!xLines || !yLines) return null;
  if (!stableLines(xLines) || !stableLines(yLines)) return null;
  const w = xLines.length - 1;
  const h = yLines.length - 1;
  if (w < 2 || h < 2 || w > 220 || h > 220) return null;
  return { xLines, yLines, w, h, source: 'auto' };
}

function sampleCellColor(imgData: ImageData, x0: number, y0: number, x1: number, y1: number): [number, number, number] {
  const { width, data } = imgData;
  const cellW = Math.max(1, x1 - x0);
  const cellH = Math.max(1, y1 - y0);
  // Match the "主色" generation idea: ignore cell borders, then choose the
  // dominant colour cluster instead of averaging all pixels together.
  const left = Math.round(x0 + cellW * 0.16);
  const right = Math.round(x0 + cellW * 0.84);
  const top = Math.round(y0 + cellH * 0.16);
  const bottom = Math.round(y0 + cellH * 0.84);
  const sampleCols = Math.max(5, Math.min(18, Math.round(cellW * 0.65)));
  const sampleRows = Math.max(5, Math.min(18, Math.round(cellH * 0.65)));
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const rx = Math.max(1, (right - left) / 2);
  const ry = Math.max(1, (bottom - top) / 2);

  const bins = new Map<number, { weight: number; count: number; sumR: number; sumG: number; sumB: number }>();
  let bestKey = 0;
  let bestWeight = -1;

  for (let row = 0; row < sampleRows; row++) {
    for (let col = 0; col < sampleCols; col++) {
      const sx = clamp(Math.round(left + ((col + 0.5) / sampleCols) * (right - left)), x0, Math.max(x0, x1 - 1));
      const sy = clamp(Math.round(top + ((row + 0.5) / sampleRows) * (bottom - top)), y0, Math.max(y0, y1 - 1));
      const o = (sy * width + sx) * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const nx = (sx - cx) / rx;
      const ny = (sy - cy) / ry;
      const centerWeight = 1 + Math.max(0, 1 - (nx * nx + ny * ny)) * 0.55;
      // 6-bit bins, same precision as the generation dominant mode.
      const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      const bin = bins.get(key);
      if (bin) {
        bin.weight += centerWeight;
        bin.count += 1;
        bin.sumR += r * centerWeight;
        bin.sumG += g * centerWeight;
        bin.sumB += b * centerWeight;
        if (bin.weight > bestWeight) {
          bestWeight = bin.weight;
          bestKey = key;
        }
      } else {
        bins.set(key, { weight: centerWeight, count: 1, sumR: r * centerWeight, sumG: g * centerWeight, sumB: b * centerWeight });
        if (centerWeight > bestWeight) {
          bestWeight = centerWeight;
          bestKey = key;
        }
      }
    }
  }

  const best = bins.get(bestKey);
  if (!best || best.weight <= 0) {
    const x = clamp(Math.round((x0 + x1) / 2), x0, Math.max(x0, x1 - 1));
    const y = clamp(Math.round((y0 + y1) / 2), y0, Math.max(y0, y1 - 1));
    const o = (y * width + x) * 4;
    return [data[o], data[o + 1], data[o + 2]];
  }

  return [
    Math.round(best.sumR / best.weight),
    Math.round(best.sumG / best.weight),
    Math.round(best.sumB / best.weight),
  ];
}

export interface RecognizePatternOptions {
  brand: BeadBrand;
  width: number;
  height: number;
  palette: CompiledBeadColor[];
  preferAutoGrid?: boolean;
}

export interface RecognizePatternResult {
  pattern: BeadPattern;
  palette: CompiledBeadColor[];
  gridSource: 'auto' | 'manual' | 'auto-cropped' | 'manual-cropped';
}

function samplesToCells(samples: Rgb[], w: number, h: number, palette: CompiledBeadColor[]): BeadCell[][] {
  const clusters = new Map<number, { count: number; sumR: number; sumG: number; sumB: number; colorId?: string }>();
  const sampleKeys: number[] = [];

  for (const sample of samples) {
    // 6-bit cluster, same family as 主色模式; this stabilizes JPEG/screenshot noise.
    const key = ((sample.r >> 2) << 12) | ((sample.g >> 2) << 6) | (sample.b >> 2);
    sampleKeys.push(key);
    const cluster = clusters.get(key);
    if (cluster) {
      cluster.count += 1;
      cluster.sumR += sample.r;
      cluster.sumG += sample.g;
      cluster.sumB += sample.b;
    } else {
      clusters.set(key, { count: 1, sumR: sample.r, sumG: sample.g, sumB: sample.b });
    }
  }

  for (const cluster of clusters.values()) {
    const rgb = {
      r: Math.round(cluster.sumR / cluster.count),
      g: Math.round(cluster.sumG / cluster.count),
      b: Math.round(cluster.sumB / cluster.count),
    };
    cluster.colorId = matchColor(rgb, palette).id;
  }

  const cells: BeadCell[][] = [];
  for (let y = 0; y < h; y++) {
    const row: BeadCell[] = [];
    for (let x = 0; x < w; x++) {
      const key = sampleKeys[y * w + x];
      row.push({ colorId: clusters.get(key)!.colorId! });
    }
    cells.push(row);
  }
  return cells;
}

export async function recognizePatternFromImage(file: File, opts: RecognizePatternOptions): Promise<RecognizePatternResult> {
  if (!opts.palette.length) throw new Error('当前色板为空，无法识别图纸颜色。');
  const imgData = await imageToImageData(file);
  const croppedData = cropImageDataToContent(imgData);
  const originalGrid = opts.preferAutoGrid === false ? null : detectGrid(imgData);
  const croppedGrid = !originalGrid && opts.preferAutoGrid !== false && croppedData !== imgData ? detectGrid(croppedData) : null;
  const workData = originalGrid ? imgData : croppedData;
  const autoGrid = originalGrid ?? croppedGrid;
  const grid = autoGrid ?? buildEvenGrid(workData, opts.width, opts.height);
  const gridSource: RecognizePatternResult['gridSource'] = originalGrid
    ? 'auto'
    : croppedGrid
      ? 'auto-cropped'
      : croppedData !== imgData
        ? 'manual-cropped'
        : 'manual';

  let samples: Rgb[] = [];
  if (!autoGrid) {
    // No printed grid: use the same dominant downscale strategy as 主色模式.
    samples = downscale(workData.data, workData.width, workData.height, grid.w, grid.h, 'dominant');
  } else {
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        const rgb = sampleCellColor(workData, grid.xLines[x], grid.yLines[y], grid.xLines[x + 1], grid.yLines[y + 1]);
        samples.push({ r: rgb[0], g: rgb[1], b: rgb[2] });
      }
    }
  }

  const cells = samplesToCells(samples, grid.w, grid.h, opts.palette);

  return {
    palette: opts.palette,
    gridSource,
    pattern: {
      version: 1,
      metadata: {
        brand: opts.brand,
        width: grid.w,
        height: grid.h,
        dithering: 'none',
        background: 'white',
        createdAt: new Date().toISOString(),
      },
      cells,
    },
  };
}
