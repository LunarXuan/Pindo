export interface Pixel { r: number; g: number; b: number }

export function sharpenPixels(
  pixels: Pixel[], width: number, height: number, amount: number
): Pixel[] {
  if (amount <= 0) return pixels;
  const a = amount / 100;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const out = new Array<Pixel>(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        out[i] = pixels[i]; continue;
      }
      const c = pixels[i];
      const t = pixels[i - width], b = pixels[i + width];
      const l = pixels[i - 1], r = pixels[i + 1];
      // Laplacian: center*4 - neighbors, then blend
      out[i] = {
        r: clamp(c.r + a * (4 * c.r - t.r - b.r - l.r - r.r)),
        g: clamp(c.g + a * (4 * c.g - t.g - b.g - l.g - r.g)),
        b: clamp(c.b + a * (4 * c.b - t.b - b.b - l.b - r.b)),
      };
    }
  }
  return out;
}

export function sharpenSource(
  data: Uint8ClampedArray, w: number, h: number, amount: number
): void {
  if (amount <= 0) return;
  const a = amount / 100;
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const t = i - w * 4, b = i + w * 4;
      for (let c = 0; c < 3; c++) {
        const lap = 4 * copy[i+c] - copy[t+c] - copy[b+c] - copy[i-4+c] - copy[i+4+c];
        data[i+c] = Math.max(0, Math.min(255, Math.round(copy[i+c] + a * lap)));
      }
    }
  }
}

export function adjustPixels(
  pixels: Pixel[],
  brightness: number,
  contrast: number,
  saturation: number,
): Pixel[] {
  if (!brightness && !contrast && !saturation) return pixels;
  const b = brightness * 2.55;
  const c = (100 + contrast) / 100;
  const s = (100 + saturation) / 100;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return pixels.map(p => {
    let r = p.r + b, g = p.g + b, bl = p.b + b;
    r = (r - 128) * c + 128;
    g = (g - 128) * c + 128;
    bl = (bl - 128) * c + 128;
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    // Suppress saturation boost for near-gray pixels to prevent
    // tiny color shifts (e.g. anti-aliasing artifacts) from being amplified.
    // For high-luminance low-chroma pixels (anti-aliased edges near white),
    // fully desaturate to eliminate blue/cyan halo artifacts.
    const maxDev = Math.max(Math.abs(r - gray), Math.abs(g - gray), Math.abs(bl - gray));
    const isNearWhiteLowChroma = gray > 200 && maxDev < 15;
    const es = isNearWhiteLowChroma ? Math.min(1, s) : s;
    const dr = isNearWhiteLowChroma && maxDev < 8 ? 0 : (r - gray) * es;
    const dg = isNearWhiteLowChroma && maxDev < 8 ? 0 : (g - gray) * es;
    const db = isNearWhiteLowChroma && maxDev < 8 ? 0 : (bl - gray) * es;
    return {
      r: clamp(gray + dr),
      g: clamp(gray + dg),
      b: clamp(gray + db),
    };
  });
}
