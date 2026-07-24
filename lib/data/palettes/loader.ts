import type { BeadBrand, CompiledBeadColor } from '@/lib/types/bead';

const paletteCache = new Map<BeadBrand, CompiledBeadColor[]>();

export async function loadPalette(brand: BeadBrand): Promise<CompiledBeadColor[]> {
  if (paletteCache.has(brand)) return paletteCache.get(brand)!;
  const data = (await import(`./${brand}.json`)).default as CompiledBeadColor[];
  paletteCache.set(brand, data);
  return data;
}

export function getAvailableBrands(): BeadBrand[] {
  return ['perler', 'hama', 'artkal-s', 'mard', 'coco', 'manman', 'panpan', 'mixiaowo'];
}
