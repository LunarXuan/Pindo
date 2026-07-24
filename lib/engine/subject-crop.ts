import type { BackgroundMode } from './image-loader';

export interface SubjectCropOptions {
  background: BackgroundMode;
  alphaThreshold?: number;
  colorTolerance?: number;
  paddingRatio?: number;
  minForegroundPixels?: number;
  minCropFillRatio?: number;
}

export interface SubjectCropResult {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  cropped: boolean;
}

const DEFAULT_ALPHA_THRESHOLD = 20;
const DEFAULT_COLOR_TOLERANCE = 20;
const DEFAULT_PADDING_RATIO = 0.02;
const DEFAULT_MIN_CROP_FILL_RATIO = 0.96;

export function cropToSubject(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: SubjectCropOptions
): SubjectCropResult {
  if (width <= 0 || height <= 0 || data.length !== width * height * 4) {
    return { data, width, height, offsetX: 0, offsetY: 0, cropped: false };
  }

  const alphaThreshold = options.alphaThreshold ?? DEFAULT_ALPHA_THRESHOLD;
  const colorTolerance = options.colorTolerance ?? DEFAULT_COLOR_TOLERANCE;
  const paddingRatio = options.paddingRatio ?? DEFAULT_PADDING_RATIO;
  const minCropFillRatio = options.minCropFillRatio ?? DEFAULT_MIN_CROP_FILL_RATIO;
  const minForegroundPixels = options.minForegroundPixels ?? Math.max(12, Math.floor(width * height * 0.0015));
  const tol2 = colorTolerance * colorTolerance;

  const [bgR, bgG, bgB] = estimateBorderBackground(data, width, height);

  // Use a coarse foreground connected-component bbox to avoid tiny outliers (e.g. watermarks)
  // pulling the crop too wide.
  const sampleMaxDim = 256;
  const scale = Math.min(1, sampleMaxDim / Math.max(width, height));
  const sampleW = Math.max(1, Math.round(width * scale));
  const sampleH = Math.max(1, Math.round(height * scale));
  const sampleCounts = new Uint32Array(sampleW * sampleH);

  let foregroundCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (!isForegroundPixel(data[i], data[i + 1], data[i + 2], a, options.background, bgR, bgG, bgB, alphaThreshold, tol2)) {
        continue;
      }
      foregroundCount++;
      const sx = Math.min(sampleW - 1, Math.floor((x * sampleW) / width));
      const sy = Math.min(sampleH - 1, Math.floor((y * sampleH) / height));
      sampleCounts[sy * sampleW + sx] += 1;
    }
  }

  if (foregroundCount < minForegroundPixels) {
    return { data, width, height, offsetX: 0, offsetY: 0, cropped: false };
  }

  const visited = new Uint8Array(sampleW * sampleH);
  const components: Array<{ weight: number; minX: number; minY: number; maxX: number; maxY: number }> = [];
  let bestWeight = 0;

  for (let start = 0; start < sampleCounts.length; start++) {
    if (visited[start]) continue;
    if (sampleCounts[start] === 0) continue;

    let weight = 0;
    let minX = sampleW;
    let minY = sampleH;
    let maxX = -1;
    let maxY = -1;
    const stack: number[] = [start];
    visited[start] = 1;

    while (stack.length > 0) {
      const idx = stack.pop()!;
      const cellWeight = sampleCounts[idx];
      if (cellWeight === 0) continue;
      weight += cellWeight;

      const x = idx % sampleW;
      const y = (idx - x) / sampleW;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (x > 0) {
        const n = idx - 1;
        if (!visited[n] && sampleCounts[n] > 0) { visited[n] = 1; stack.push(n); }
      }
      if (x + 1 < sampleW) {
        const n = idx + 1;
        if (!visited[n] && sampleCounts[n] > 0) { visited[n] = 1; stack.push(n); }
      }
      if (y > 0) {
        const n = idx - sampleW;
        if (!visited[n] && sampleCounts[n] > 0) { visited[n] = 1; stack.push(n); }
      }
      if (y + 1 < sampleH) {
        const n = idx + sampleW;
        if (!visited[n] && sampleCounts[n] > 0) { visited[n] = 1; stack.push(n); }
      }
    }

    if (weight <= 0) continue;
    components.push({ weight, minX, minY, maxX, maxY });
    if (weight > bestWeight) bestWeight = weight;
  }

  if (components.length === 0 || bestWeight <= 0) {
    return { data, width, height, offsetX: 0, offsetY: 0, cropped: false };
  }

  const componentMinRatio = 0.02;
  const keepMinWeight = Math.max(1, Math.floor(bestWeight * componentMinRatio));
  let minX = sampleW;
  let minY = sampleH;
  let maxX = -1;
  let maxY = -1;

  for (const c of components) {
    if (c.weight < keepMinWeight) continue;
    if (c.minX < minX) minX = c.minX;
    if (c.minY < minY) minY = c.minY;
    if (c.maxX > maxX) maxX = c.maxX;
    if (c.maxY > maxY) maxY = c.maxY;
  }

  if (maxX < minX || maxY < minY) {
    return { data, width, height, offsetX: 0, offsetY: 0, cropped: false };
  }

  let cropMinX = Math.floor((minX * width) / sampleW);
  let cropMinY = Math.floor((minY * height) / sampleH);
  let cropMaxX = Math.ceil(((maxX + 1) * width) / sampleW) - 1;
  let cropMaxY = Math.ceil(((maxY + 1) * height) / sampleH) - 1;

  cropMinX = Math.max(0, Math.min(width - 1, cropMinX));
  cropMinY = Math.max(0, Math.min(height - 1, cropMinY));
  cropMaxX = Math.max(0, Math.min(width - 1, cropMaxX));
  cropMaxY = Math.max(0, Math.min(height - 1, cropMaxY));

  const pad = Math.max(0, Math.round(Math.min(width, height) * paddingRatio));
  cropMinX = Math.max(0, cropMinX - pad);
  cropMinY = Math.max(0, cropMinY - pad);
  cropMaxX = Math.min(width - 1, cropMaxX + pad);
  cropMaxY = Math.min(height - 1, cropMaxY + pad);

  const cropW = cropMaxX - cropMinX + 1;
  const cropH = cropMaxY - cropMinY + 1;
  if (cropW >= width || cropH >= height) {
    return { data, width, height, offsetX: 0, offsetY: 0, cropped: false };
  }
  if ((cropW * cropH) / (width * height) >= minCropFillRatio) {
    return { data, width, height, offsetX: 0, offsetY: 0, cropped: false };
  }

  const cropped = new Uint8ClampedArray(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    const srcStart = ((cropMinY + y) * width + cropMinX) * 4;
    const srcEnd = srcStart + cropW * 4;
    const dstStart = y * cropW * 4;
    cropped.set(data.subarray(srcStart, srcEnd), dstStart);
  }

  return { data: cropped, width: cropW, height: cropH, offsetX: cropMinX, offsetY: cropMinY, cropped: true };
}

function isForegroundPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  background: BackgroundMode,
  bgR: number,
  bgG: number,
  bgB: number,
  alphaThreshold: number,
  tol2: number
): boolean {
  if (background === 'transparent') {
    return a > alphaThreshold;
  }
  if (a <= alphaThreshold / 2) return false;
  const dr = r - bgR;
  const dg = g - bgG;
  const db = b - bgB;
  return dr * dr + dg * dg + db * db >= tol2;
}

function estimateBorderBackground(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  // Robust estimate: pick the most frequent (quantized) border color to avoid
  // small outliers (like watermarks) biasing the background average.
  const bucketCount = 16; // 4-bit per channel
  const buckets = bucketCount * bucketCount * bucketCount; // 4096
  const counts = new Uint32Array(buckets);
  const sumR = new Uint32Array(buckets);
  const sumG = new Uint32Array(buckets);
  const sumB = new Uint32Array(buckets);

  const visit = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const a = data[i + 3];
    if (a <= 0) return;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const w = a;
    counts[key] += w;
    sumR[key] += r * w;
    sumG[key] += g * w;
    sumB[key] += b * w;
  };

  for (let x = 0; x < width; x++) {
    visit(x, 0);
    if (height > 1) visit(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    visit(0, y);
    if (width > 1) visit(width - 1, y);
  }

  let bestKey = -1;
  let bestWeight = 0;
  for (let k = 0; k < counts.length; k++) {
    const w = counts[k];
    if (w > bestWeight) {
      bestWeight = w;
      bestKey = k;
    }
  }

  if (bestKey < 0 || bestWeight === 0) return [255, 255, 255];
  return [
    Math.round(sumR[bestKey] / bestWeight),
    Math.round(sumG[bestKey] / bestWeight),
    Math.round(sumB[bestKey] / bestWeight),
  ];
}
