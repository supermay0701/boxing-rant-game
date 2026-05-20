import { describe, it, expect } from 'vitest';
import { posterize } from '../../src/shared/CartoonFilter';

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
