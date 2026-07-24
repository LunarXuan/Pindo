import type { CompiledBeadColor } from '@/lib/types/bead';
import type { DownscaledPixel } from './downscaler';

interface LabColor { L: number; a: number; b: number; }

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function rgbToLab(r: number, g: number, b: number): LabColor {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  let x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
  let y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750;
  let z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041;
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(x / 0.95047), fy = f(y / 1.0), fz = f(z / 1.08883);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function buildPaletteMap(palette: CompiledBeadColor[]): { labColors: LabColor[]; idMap: Map<string, CompiledBeadColor> } {
  const labColors = palette.map(c => ({
    L: c.lab[0], a: c.lab[1], b: c.lab[2],
    // color-diff needs R,G,B for closest() key matching
    R: c.rgb[0], G: c.rgb[1], B: c.rgb[2],
  }));
  const idMap = new Map(palette.map(c => [`${c.rgb[0]}-${c.rgb[1]}-${c.rgb[2]}`, c]));
  return { labColors: labColors as LabColor[], idMap };
}

export function matchColor(pixel: DownscaledPixel, palette: CompiledBeadColor[]): CompiledBeadColor {
  if (palette.length === 0) throw new Error('Palette is empty');
  const pixelLab = rgbToLab(pixel.r, pixel.g, pixel.b);
  let bestMatch = palette[0];
  let bestDist = Infinity;

  for (const color of palette) {
    const dist = ciede2000(pixelLab, { L: color.lab[0], a: color.lab[1], b: color.lab[2] });
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = color;
    }
  }
  return bestMatch;
}

export function matchColors(pixels: DownscaledPixel[], palette: CompiledBeadColor[]): CompiledBeadColor[] {
  return pixels.map(p => matchColor(p, palette));
}

// Simplified CIEDE2000 implementation
function ciede2000(lab1: LabColor, lab2: LabColor): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;
  const kL = 1, kC = 1, kH = 1;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1 + C2) / 2;
  const Cab7 = Math.pow(Cab, 7);
  const G = 0.5 * (1 - Math.sqrt(Cab7 / (Cab7 + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = Math.atan2(b1, a1p) * 180 / Math.PI + (b1 < 0 ? 360 : 0);
  const h2p = Math.atan2(b2, a2p) * 180 / Math.PI + (b2 < 0 ? 360 : 0);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = h2p - h1p;
  if (Math.abs(dhp) > 180) dhp += dhp > 0 ? -360 : 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);

  const Lp = (L1 + L2) / 2;
  const Cp = (C1p + C2p) / 2;
  let hp = (h1p + h2p) / 2;
  if (Math.abs(h1p - h2p) > 180) hp -= 180;
  if (hp < 0) hp += 360;

  const T = 1
    - 0.17 * Math.cos((hp - 30) * Math.PI / 180)
    + 0.24 * Math.cos(2 * hp * Math.PI / 180)
    + 0.32 * Math.cos((3 * hp + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * hp - 63) * Math.PI / 180);

  const SL = 1 + 0.015 * Math.pow(Lp - 50, 2) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
  const SC = 1 + 0.045 * Cp;
  const SH = 1 + 0.015 * Cp * T;

  const Cp7 = Math.pow(Cp, 7);
  const RT = -2 * Math.sqrt(Cp7 / (Cp7 + Math.pow(25, 7)))
    * Math.sin(60 * Math.exp(-Math.pow((hp - 275) / 25, 2)) * Math.PI / 180);

  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
    Math.pow(dCp / (kC * SC), 2) +
    Math.pow(dHp / (kH * SH), 2) +
    RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  );
}
