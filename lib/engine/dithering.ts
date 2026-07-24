import type { DownscaledPixel } from './downscaler';

export type DitheringMode = 'none' | 'floyd-steinberg' | 'ordered';

export function applyDithering(
  pixels: DownscaledPixel[],
  width: number,
  height: number,
  mode: DitheringMode,
  matchFn: (pixel: DownscaledPixel) => { r: number; g: number; b: number }
): DownscaledPixel[] {
  if (mode === 'none') return pixels;
  if (mode === 'floyd-steinberg') return floydSteinberg(pixels, width, height, matchFn);
  return pixels; // ordered dithering placeholder
}

function floydSteinberg(
  pixels: DownscaledPixel[],
  width: number,
  height: number,
  matchFn: (pixel: DownscaledPixel) => { r: number; g: number; b: number }
): DownscaledPixel[] {
  const buf = pixels.map(p => ({ r: p.r, g: p.g, b: p.b }));

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const spread = (idx: number, er: number, eg: number, eb: number, factor: number) => {
    if (idx >= 0 && idx < buf.length) {
      buf[idx].r = clamp(buf[idx].r + er * factor);
      buf[idx].g = clamp(buf[idx].g + eg * factor);
      buf[idx].b = clamp(buf[idx].b + eb * factor);
    }
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const old = { ...buf[i] };
      const matched = matchFn(buf[i]);
      buf[i] = { r: matched.r, g: matched.g, b: matched.b };

      const er = old.r - matched.r;
      const eg = old.g - matched.g;
      const eb = old.b - matched.b;

      if (x + 1 < width) spread(i + 1, er, eg, eb, 7 / 16);
      if (y + 1 < height) {
        if (x > 0) spread(i + width - 1, er, eg, eb, 3 / 16);
        spread(i + width, er, eg, eb, 5 / 16);
        if (x + 1 < width) spread(i + width + 1, er, eg, eb, 1 / 16);
      }
    }
  }
  return buf;
}
