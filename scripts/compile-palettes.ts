import * as fs from 'fs';
import * as path from 'path';

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function linearToXYZ(r: number, g: number, b: number): [number, number, number] {
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
  ];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const refX = 0.95047, refY = 1.0, refZ = 1.08883;
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(x / refX), fy = f(y / refY), fz = f(z / refZ);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  return xyzToLab(...linearToXYZ(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)));
}

interface RawColor { code: string; name: string; hex: string; }

const brandMap: Record<string, { brand: string; source: string; license: string }> = {
  'perler': { brand: 'perler', source: 'community-sourced', license: 'community' },
  'hama': { brand: 'hama', source: 'community-sourced', license: 'community' },
  'artkal-s': { brand: 'artkal-s', source: 'community-sourced', license: 'community' },
};

const rawDir = path.join(__dirname, '..', 'lib', 'data', 'raw');
const outDir = path.join(__dirname, '..', 'lib', 'data', 'palettes');

fs.mkdirSync(outDir, { recursive: true });

for (const file of fs.readdirSync(rawDir)) {
  if (!file.endsWith('.json')) continue;
  const brandKey = file.replace('.json', '');
  const info = brandMap[brandKey];
  if (!info) continue;

  const raw: RawColor[] = JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf-8'));
  const compiled = raw.map(c => {
    const rgb = hexToRgb(c.hex);
    const lab = rgbToLab(...rgb).map(v => Math.round(v * 100) / 100) as [number, number, number];
    return {
      id: `${info.brand}-${c.code}`,
      brand: info.brand,
      code: c.code,
      name: c.name,
      hex: c.hex,
      rgb,
      lab,
      source: info.source,
      license: info.license,
    };
  });

  fs.writeFileSync(path.join(outDir, `${brandKey}.json`), JSON.stringify(compiled, null, 2));
  console.log(`Compiled ${brandKey}: ${compiled.length} colors`);
}
console.log('All palettes compiled.');
