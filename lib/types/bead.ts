export type BeadBrand = 'perler' | 'hama' | 'artkal-s' | 'artkal-r' | 'artkal-c' | 'artkal-a' | 'mard' | 'coco' | 'manman' | 'panpan' | 'mixiaowo';

export type DitheringMode = 'none' | 'floyd-steinberg' | 'ordered';

export interface CompiledBeadColor {
  id: string;
  brand: BeadBrand;
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  lab: [number, number, number];
  source: string;
  license: string;
}

export interface BeadCell {
  colorId: string;
  isEmpty?: boolean;
}

export interface BeadPattern {
  version: 1;
  metadata: {
    brand: BeadBrand;
    width: number;
    height: number;
    dithering: DitheringMode;
    background: 'white' | 'black' | 'transparent';
    createdAt: string;
    sourceHash?: string;
  };
  cells: BeadCell[][];
}

export interface PatchOp {
  type: 'set';
  row: number;
  col: number;
  oldColorId: string;
  newColorId: string;
}

export type HistoryEntry = PatchOp[];

export interface BeadUsageItem {
  colorId: string;
  color: CompiledBeadColor;
  count: number;
}
