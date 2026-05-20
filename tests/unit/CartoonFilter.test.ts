import { describe, it, expect } from 'vitest';
import { posterize, sobelEdges } from '../../src/shared/CartoonFilter';

describe('CartoonFilter.posterize', () => {
  it('quantizes channel values to 6 buckets', () => {
    // 6 buckets => bucket size = 256/6 ≈ 42.67
    const input = new Uint8ClampedArray([0, 50, 200, 255, 0, 0, 0, 255]); // 2 pixels (RGBA)
    posterize(input, 6);
    expect(input[0]).toBe(0);
    expect(input[1]).toBe(42);
    expect(input[2]).toBe(170);
    expect(input[3]).toBe(255);            // alpha preserved
    expect(input[7]).toBe(255);            // alpha preserved
  });

  it('preserves array length', () => {
    const arr = new Uint8ClampedArray(40);
    posterize(arr, 6);
    expect(arr.length).toBe(40);
  });
});

describe('CartoonFilter.sobelEdges', () => {
  it('detects edges on a high-contrast 4x4 image', () => {
    // 4x4 image, left half black, right half white
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const i = (y * 4 + x) * 4;
        const v = x < 2 ? 0 : 255;
        data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
      }
    }
    const edges = sobelEdges(data, 4, 4);
    // Column 1-2 boundary should have high edge magnitude
    expect(edges[1 * 4 + 1]).toBeGreaterThan(100);
  });
});
