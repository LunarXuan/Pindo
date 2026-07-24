import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = JSON.parse(readFileSync(join(__dirname, '../palette-source/colorSystemMapping.json'), 'utf8'));
const outDir = join(__dirname, '../lib/data/palettes');

function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function rgbToLab(r, g, b) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  let x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
  let y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750;
  let z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041;
  const f = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(x / 0.95047), fy = f(y / 1.0), fz = f(z / 1.08883);
  return [+(116 * fy - 16).toFixed(2), +(500 * (fx - fy)).toFixed(2), +(200 * (fy - fz)).toFixed(2)];
}

function parseHex(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const brands = [
  { key: 'MARD', id: 'mard' },
  { key: 'COCO', id: 'coco' },
  { key: '漫漫', id: 'manman' },
  { key: '盼盼', id: 'panpan' },
  { key: '咪小窝', id: 'mixiaowo' },
];

for (const { key, id } of brands) {
  const seen = new Set();
  const colors = [];
  for (const [hex, mapping] of Object.entries(src)) {
    const code = mapping[key];
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const rgb = parseHex(hex);
    const lab = rgbToLab(...rgb);
    colors.push({ id: `${id}-${code}`, brand: id, code, name: code, hex: hex.toUpperCase(), rgb, lab, source: 'colorSystemMapping', license: 'community' });
  }
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify(colors, null, 2) + '\n');
  console.log(`${id}: ${colors.length} colors`);
}
