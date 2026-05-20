const POSTERIZE_LEVELS = 6;
const SATURATION = 1.6;
const EDGE_THRESHOLD = 90;
const TARGET_SIZE = 256;

export function posterize(data: Uint8ClampedArray, levels: number): void {
  const bucket = 256 / levels;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.floor(Math.floor(data[i]     / bucket) * bucket);
    data[i + 1] = Math.floor(Math.floor(data[i + 1] / bucket) * bucket);
    data[i + 2] = Math.floor(Math.floor(data[i + 2] / bucket) * bucket);
  }
}

/** Returns Uint8Array of edge magnitudes (grayscale), same width*height as input. */
export function sobelEdges(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const gray = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    gray[j] = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) | 0;
  }
  const at = (x: number, y: number) => gray[y * w + x];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx = -at(x-1,y-1) -2*at(x-1,y) -at(x-1,y+1) + at(x+1,y-1) +2*at(x+1,y) + at(x+1,y+1);
      const gy = -at(x-1,y-1) -2*at(x,y-1) -at(x+1,y-1) + at(x-1,y+1) +2*at(x,y+1) + at(x+1,y+1);
      out[y * w + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy) | 0);
    }
  }
  return out;
}

/**
 * Apply full cartoon pipeline: resize → saturate → posterize → sobel overlay → circle mask.
 * Returns 256x256 ImageBitmap with transparent background outside circle.
 * Falls back to plain circle crop if OffscreenCanvas isn't available.
 */
export async function applyCartoonFilter(file: File): Promise<ImageBitmap> {
  const bitmap = await createImageBitmap(file);

  if (typeof OffscreenCanvas === 'undefined') {
    return circleCropFallback(bitmap);
  }

  // Step 1: resize 256x256 + saturate via ctx.filter
  const off = new OffscreenCanvas(TARGET_SIZE, TARGET_SIZE);
  const ctx = off.getContext('2d')!;
  ctx.filter = `saturate(${SATURATION})`;
  ctx.drawImage(bitmap, 0, 0, TARGET_SIZE, TARGET_SIZE);
  ctx.filter = 'none';

  // Step 2: posterize on pixel buffer
  const img = ctx.getImageData(0, 0, TARGET_SIZE, TARGET_SIZE);
  posterize(img.data, POSTERIZE_LEVELS);

  // Step 3: sobel edges → overlay black where edge > threshold
  const edges = sobelEdges(img.data, TARGET_SIZE, TARGET_SIZE);
  for (let i = 0, j = 0; i < img.data.length; i += 4, j++) {
    if (edges[j] > EDGE_THRESHOLD) {
      img.data[i] = 0; img.data[i + 1] = 0; img.data[i + 2] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Step 4: circle mask
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.arc(TARGET_SIZE / 2, TARGET_SIZE / 2, TARGET_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  return off.transferToImageBitmap();
}

async function circleCropFallback(bitmap: ImageBitmap): Promise<ImageBitmap> {
  const c = document.createElement('canvas');
  c.width = TARGET_SIZE; c.height = TARGET_SIZE;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, TARGET_SIZE, TARGET_SIZE);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.arc(TARGET_SIZE / 2, TARGET_SIZE / 2, TARGET_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  return createImageBitmap(c);
}
