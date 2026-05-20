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
    // alpha (i+3) untouched
  }
}

export async function applyCartoonFilter(_file: File): Promise<ImageBitmap> {
  // Implementation in Task 8
  throw new Error('not implemented');
}

// Exported for use in Task 8 / future:
export const _config = { POSTERIZE_LEVELS, SATURATION, EDGE_THRESHOLD, TARGET_SIZE };
