import type { BeadPattern, BeadCell, CompiledBeadColor, BeadBrand, DitheringMode } from '@/lib/types/bead';
import type { BackgroundMode } from './image-loader';
import { loadImage, imageToPixels } from './image-loader';
import { downscale, type DownscaledPixel } from './downscaler';
import { matchColor, matchColors } from './color-matcher';
import { applyDithering } from './dithering';
import { loadPalette } from '@/lib/data/palettes/loader';

export interface PipelineOptions {
  brand: BeadBrand;
  width: number;
  height: number;
  dithering: DitheringMode;
  background: BackgroundMode;
}

export const DEFAULT_OPTIONS: PipelineOptions = {
  brand: 'perler',
  width: 29,
  height: 29,
  dithering: 'none',
  background: 'white',
};

export async function runPipeline(file: File, opts: Partial<PipelineOptions> = {}): Promise<BeadPattern> {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const palette = await loadPalette(options.brand);

  // 1. Load & preprocess
  const img = await loadImage(file);
  const loaded = imageToPixels(img, options.background);

  // 2. Linear RGB downscale
  const pixels = downscale(loaded.data, loaded.width, loaded.height, options.width, options.height);

  // 3. Dithering + color matching
  const matchFn = (p: DownscaledPixel) => {
    const c = matchColor(p, palette);
    return { r: c.rgb[0], g: c.rgb[1], b: c.rgb[2] };
  };
  const dithered = applyDithering(pixels, options.width, options.height, options.dithering, matchFn);

  // 4. Final color matching
  const matched = options.dithering === 'none'
    ? matchColors(pixels, palette)
    : matchColors(dithered, palette);

  // 5. Build pattern
  const cells: BeadCell[][] = [];
  for (let y = 0; y < options.height; y++) {
    const row: BeadCell[] = [];
    for (let x = 0; x < options.width; x++) {
      row.push({ colorId: matched[y * options.width + x].id });
    }
    cells.push(row);
  }

  return {
    version: 1,
    metadata: {
      brand: options.brand,
      width: options.width,
      height: options.height,
      dithering: options.dithering,
      background: options.background,
      createdAt: new Date().toISOString(),
    },
    cells,
  };
}
