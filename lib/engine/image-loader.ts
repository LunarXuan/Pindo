export interface LoadedImage {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA
}

export type BackgroundMode = 'white' | 'black' | 'transparent';

export async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

export function imageToPixels(img: HTMLImageElement, bg: BackgroundMode = 'white'): LoadedImage {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;

  // Fill background for transparent images
  if (bg !== 'transparent') {
    ctx.fillStyle = bg === 'white' ? '#FFFFFF' : '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: imageData.data };
}

export function processAlpha(data: Uint8ClampedArray, bg: BackgroundMode): void {
  if (bg === 'transparent') return;
  const bgR = bg === 'white' ? 255 : 0;
  const bgG = bg === 'white' ? 255 : 0;
  const bgB = bg === 'white' ? 255 : 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a < 1) {
      data[i] = Math.round(data[i] * a + bgR * (1 - a));
      data[i + 1] = Math.round(data[i + 1] * a + bgG * (1 - a));
      data[i + 2] = Math.round(data[i + 2] * a + bgB * (1 - a));
      data[i + 3] = 255;
    }
  }
}
