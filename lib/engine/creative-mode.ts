import type { DitheringMode } from '@/lib/types/bead';
import type { PixelationMode } from './downscaler';

export type CreativeMode = 'fine' | 'rough' | 'simple';

export interface CreativeModeSettings {
  label: string;
  pixMode: PixelationMode;
  dithering: DitheringMode;
  lowResOptimize: boolean;
  contrast: number;
  saturation: number;
}

export const CREATIVE_MODE_SETTINGS: Record<CreativeMode, CreativeModeSettings> = {
  fine: {
    label: '写实',
    pixMode: 'average',
    dithering: 'none',
    lowResOptimize: false,
    contrast: 0,
    saturation: 0,
  },
  rough: {
    label: '主色',
    pixMode: 'dominant',
    dithering: 'none',
    lowResOptimize: true,
    contrast: 12,
    saturation: 10,
  },
  simple: {
    label: '清晰',
    pixMode: 'edge-aware',
    dithering: 'none',
    lowResOptimize: true,
    contrast: 20,
    saturation: 15,
  },
};
