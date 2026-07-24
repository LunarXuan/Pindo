import { describe, expect, it } from 'vitest';
import { cropToSubject } from './subject-crop';

function createRgba(width: number, height: number, r: number, g: number, b: number, a: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return data;
}

describe('cropToSubject', () => {
  it('crops transparent image to opaque content bbox', () => {
    const data = createRgba(10, 10, 0, 0, 0, 0);
    for (let y = 2; y <= 7; y++) {
      for (let x = 3; x <= 6; x++) {
        const i = (y * 10 + x) * 4;
        data[i] = 10;
        data[i + 1] = 20;
        data[i + 2] = 30;
        data[i + 3] = 255;
      }
    }

    const out = cropToSubject(data, 10, 10, { background: 'transparent', paddingRatio: 0 });
    expect(out.cropped).toBe(true);
    expect(out.width).toBe(4);
    expect(out.height).toBe(6);
    expect(out.offsetX).toBe(3);
    expect(out.offsetY).toBe(2);
  });

  it('crops non-transparent image by border background estimation', () => {
    const data = createRgba(12, 8, 255, 255, 255, 255);
    for (let y = 1; y <= 5; y++) {
      for (let x = 2; x <= 4; x++) {
        const i = (y * 12 + x) * 4;
        data[i] = 25;
        data[i + 1] = 25;
        data[i + 2] = 25;
      }
    }

    const out = cropToSubject(data, 12, 8, {
      background: 'white',
      paddingRatio: 0,
      minForegroundPixels: 1,
      colorTolerance: 10,
    });
    expect(out.cropped).toBe(true);
    expect(out.width).toBe(3);
    expect(out.height).toBe(5);
    expect(out.offsetX).toBe(2);
    expect(out.offsetY).toBe(1);
  });

  it('keeps full image when no clear foreground exists', () => {
    const data = createRgba(9, 7, 240, 240, 240, 255);
    const out = cropToSubject(data, 9, 7, { background: 'white', paddingRatio: 0 });
    expect(out.cropped).toBe(false);
    expect(out.width).toBe(9);
    expect(out.height).toBe(7);
    expect(out.offsetX).toBe(0);
    expect(out.offsetY).toBe(0);
    expect(out.data).toBe(data);
  });
});
