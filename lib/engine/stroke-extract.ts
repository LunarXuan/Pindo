/**
 * 线稿提取：从全分辨率源图提取描边掩码，下采样到目标网格。
 * 策略：亮度阈值检测描边像素（不膨胀），下采样时用占比判定。
 */
export function extractStrokeMask(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  lumaThreshold = 90,
  coverageThreshold = 0.12,
  dilateRadius = 0,
): boolean[] {
  const mask: boolean[] = new Array(dstW * dstH);
  for (let dy = 0; dy < dstH; dy++) {
    const sy0 = Math.floor(dy * srcH / dstH);
    const sy1 = Math.floor((dy + 1) * srcH / dstH);
    for (let dx = 0; dx < dstW; dx++) {
      const sx0 = Math.floor(dx * srcW / dstW);
      const sx1 = Math.floor((dx + 1) * srcW / dstW);
      let count = 0, total = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          total++;
          const off = (sy * srcW + sx) * 4;
          const a = srcData[off + 3];
          if (a < 10) continue;
          const luma = 0.2126 * srcData[off] + 0.7152 * srcData[off + 1] + 0.0722 * srcData[off + 2];
          if (luma < lumaThreshold) count++;
        }
      }
      mask[dy * dstW + dx] = total > 0 && count / total > coverageThreshold;
    }
  }
  return dilateRadius > 0 ? dilateMask(mask, dstW, dstH, dilateRadius) : mask;
}

function dilateMask(mask: boolean[], width: number, height: number, radius: number): boolean[] {
  const r = Math.max(1, Math.min(3, radius));
  const out = mask.slice();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (let dy = -r; dy <= r; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          out[ny * width + nx] = true;
        }
      }
    }
  }
  return out;
}
