// Linear RGB downscaling (敕令 #4)
// sRGB → gamma decode → linear RGB area average → gamma encode → sRGB

export function srgbToLinear(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(value: number): number {
  const s = value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, s * 255)));
}

export interface DownscaledPixel {
  r: number; g: number; b: number; // sRGB 0-255
}

export type PixelationMode = 'average' | 'dominant' | 'edge-aware';

export interface EdgeAwareOptions {
  edgeLumaDelta?: number;
  dominantFill?: boolean;
}

export function downscale(
  data: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  mode: PixelationMode = 'average',
  edgeOptions?: EdgeAwareOptions
): DownscaledPixel[] {
  if (mode === 'dominant') return downscaleDominant(data, srcW, srcH, dstW, dstH);
  if (mode === 'edge-aware') return downscaleEdgeAware(data, srcW, srcH, dstW, dstH, edgeOptions);
  return downscaleAverage(data, srcW, srcH, dstW, dstH);
}

function downscaleAverage(
  data: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): DownscaledPixel[] {
  const result: DownscaledPixel[] = new Array(dstW * dstH);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const sx0 = Math.floor(dx * scaleX);
      const sy0 = Math.floor(dy * scaleY);
      const sx1 = Math.min(Math.ceil((dx + 1) * scaleX), srcW);
      const sy1 = Math.min(Math.ceil((dy + 1) * scaleY), srcH);

      let linR = 0, linG = 0, linB = 0, count = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * srcW + sx) * 4;
          linR += srgbToLinear(data[i]);
          linG += srgbToLinear(data[i + 1]);
          linB += srgbToLinear(data[i + 2]);
          count++;
        }
      }

      result[dy * dstW + dx] = {
        r: linearToSrgb(linR / count),
        g: linearToSrgb(linG / count),
        b: linearToSrgb(linB / count),
      };
    }
  }
  return result;
}

function downscaleDominant(
  data: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): DownscaledPixel[] {
  const result: DownscaledPixel[] = new Array(dstW * dstH);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const sx0 = Math.floor(dx * scaleX);
      const sy0 = Math.floor(dy * scaleY);
      const sx1 = Math.min(Math.ceil((dx + 1) * scaleX), srcW);
      const sy1 = Math.min(Math.ceil((dy + 1) * scaleY), srcH);

      // Quantize to 6-bit per channel for frequency counting (64 levels, 4x precision vs 5-bit)
      const freq = new Map<number, { count: number; sumR: number; sumG: number; sumB: number }>();
      let bestKey = 0, bestCount = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * srcW + sx) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
          const entry = freq.get(key);
          if (entry) {
            entry.count++; entry.sumR += r; entry.sumG += g; entry.sumB += b;
            if (entry.count > bestCount) { bestCount = entry.count; bestKey = key; }
          } else {
            freq.set(key, { count: 1, sumR: r, sumG: g, sumB: b });
            if (1 > bestCount) { bestCount = 1; bestKey = key; }
          }
        }
      }
      const best = freq.get(bestKey)!;
      result[dy * dstW + dx] = {
        r: Math.round(best.sumR / best.count),
        g: Math.round(best.sumG / best.count),
        b: Math.round(best.sumB / best.count),
      };
    }
  }
  return result;
}

function downscaleEdgeAware(
  data: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  options?: EdgeAwareOptions
): DownscaledPixel[] {
  const result: DownscaledPixel[] = new Array(dstW * dstH);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;
  const edgeMin = 0.25; // treat as edge when contrast is noticeable
  const edgeRatioMin = 0.045; // avoid turning flat areas into outlines
  const edgeShareMin = 0.55; // require a dominant edge color
  const edgeLumaDelta = options?.edgeLumaDelta ?? 18; // only use edge color if meaningfully darker
  const dominantFill = options?.dominantFill ?? false;

  const luminanceAt = (x: number, y: number): number => {
    const i = (y * srcW + x) * 4;
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  };

  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const sx0 = Math.floor(dx * scaleX);
      const sy0 = Math.floor(dy * scaleY);
      const sx1 = Math.min(Math.ceil((dx + 1) * scaleX), srcW);
      const sy1 = Math.min(Math.ceil((dy + 1) * scaleY), srcH);

      const cx = (sx0 + sx1 - 1) / 2;
      const cy = (sy0 + sy1 - 1) / 2;
      const rx = Math.max(1, (sx1 - sx0) / 2);
      const ry = Math.max(1, (sy1 - sy0) / 2);

      // Fill: gamma-corrected (linear RGB) average, center-weighted.
      // Edge: weighted histogram of high-contrast samples, to keep outlines crisp.
      let fillLinR = 0;
      let fillLinG = 0;
      let fillLinB = 0;
      let fillWeightTotal = 0;

      // Dominant color histogram (only when dominantFill enabled)
      let domFreq: Map<number, { count: number; sumR: number; sumG: number; sumB: number }> | undefined;
      let domBestKey = 0, domBestCount = 0;
      if (dominantFill) domFreq = new Map();

      const edgeBins = new Map<number, { weight: number; sumR: number; sumG: number; sumB: number }>();
      let bestEdgeKey = 0;
      let bestEdgeWeight = -1;
      let edgeWeightTotal = 0;
      let edgePixels = 0;
      let sampleCount = 0;

      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * srcW + sx) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];

          const lum = luminanceAt(sx, sy);
          const rightLum = luminanceAt(Math.min(sx + 1, srcW - 1), sy);
          const bottomLum = luminanceAt(sx, Math.min(sy + 1, srcH - 1));
          const edgeStrength = (Math.abs(lum - rightLum) + Math.abs(lum - bottomLum)) / 255;

          const nx = (sx - cx) / rx;
          const ny = (sy - cy) / ry;
          const centerWeight = 1 + Math.max(0, 1 - (nx * nx + ny * ny)) * 0.35;

          fillLinR += srgbToLinear(r) * centerWeight;
          fillLinG += srgbToLinear(g) * centerWeight;
          fillLinB += srgbToLinear(b) * centerWeight;
          fillWeightTotal += centerWeight;

          if (domFreq && edgeStrength < edgeMin) {
            const dk = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
            const de = domFreq.get(dk);
            if (de) {
              de.count++; de.sumR += r; de.sumG += g; de.sumB += b;
              if (de.count > domBestCount) { domBestCount = de.count; domBestKey = dk; }
            } else {
              domFreq.set(dk, { count: 1, sumR: r, sumG: g, sumB: b });
              if (1 > domBestCount) { domBestCount = 1; domBestKey = dk; }
            }
          }

          if (edgeStrength >= edgeMin) {
            // Quantize to 6-bit per channel for stable bins (same as dominant mode).
            const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
            const edgeW = centerWeight * Math.min(2, edgeStrength);
            let bin = edgeBins.get(key);
            if (bin) {
              bin.weight += edgeW;
              bin.sumR += r * edgeW;
              bin.sumG += g * edgeW;
              bin.sumB += b * edgeW;
            } else {
              bin = { weight: edgeW, sumR: r * edgeW, sumG: g * edgeW, sumB: b * edgeW };
              edgeBins.set(key, bin);
            }
            if (bin.weight > bestEdgeWeight) {
              bestEdgeWeight = bin.weight;
              bestEdgeKey = key;
            }
            edgeWeightTotal += edgeW;
            edgePixels += 1;
          }

          sampleCount += 1;
        }
      }

      if (fillWeightTotal <= 0 || sampleCount <= 0) {
        result[dy * dstW + dx] = { r: 0, g: 0, b: 0 };
        continue;
      }

      const fillR = linearToSrgb(fillLinR / fillWeightTotal);
      const fillG = linearToSrgb(fillLinG / fillWeightTotal);
      const fillB = linearToSrgb(fillLinB / fillWeightTotal);
      const fillLuma = 0.2126 * fillR + 0.7152 * fillG + 0.0722 * fillB;

      const edgeRatio = edgePixels / sampleCount;
      const edgeShare = edgeWeightTotal > 0 ? bestEdgeWeight / edgeWeightTotal : 0;
      const edge = edgeWeightTotal > 0 ? edgeBins.get(bestEdgeKey) : undefined;

      if (
        edge &&
        edge.weight > 0 &&
        edgeRatio >= edgeRatioMin &&
        edgeShare >= edgeShareMin
      ) {
        const edgeR = edge.sumR / edge.weight;
        const edgeG = edge.sumG / edge.weight;
        const edgeB = edge.sumB / edge.weight;
        const edgeLuma = 0.2126 * edgeR + 0.7152 * edgeG + 0.0722 * edgeB;
        if (edgeLuma <= fillLuma - edgeLumaDelta) {
          result[dy * dstW + dx] = { r: Math.round(edgeR), g: Math.round(edgeG), b: Math.round(edgeB) };
          continue;
        }
      }

      // When edgePixels > 0 but edge check failed, the linear average is a gray mix
      // of outline + background. Use dominant color to pick the actual majority color.
      if (domFreq && edgePixels > 0 && domBestCount > 0) {
        const dom = domFreq.get(domBestKey)!;
        result[dy * dstW + dx] = {
          r: Math.round(dom.sumR / dom.count),
          g: Math.round(dom.sumG / dom.count),
          b: Math.round(dom.sumB / dom.count),
        };
      } else {
        result[dy * dstW + dx] = { r: fillR, g: fillG, b: fillB };
      }

      // Reset dominant histogram for next cell
      if (domFreq) { domFreq.clear(); domBestKey = 0; domBestCount = 0; }
    }
  }

  return result;
}

