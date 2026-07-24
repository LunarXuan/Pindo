'use client';

import { registerPlugin } from '@capacitor/core';

export interface SaveImageOptions {
  fileName: string;
  data: string;
}

export interface SaveImageResult {
  uri: string;
}

export interface GallerySaverPlugin {
  savePng(options: SaveImageOptions): Promise<SaveImageResult>;
}

export const GallerySaver = registerPlugin<GallerySaverPlugin>('GallerySaver');
