import { describe, it, expect } from 'vitest';
import { RING_SIZE, RING_PADDING, ringBounds } from '../../src/game/Ring';

describe('Ring', () => {
  it('has 512 size', () => { expect(RING_SIZE).toBe(512); });
  it('ringBounds returns inner playable rect', () => {
    const b = ringBounds();
    expect(b.x).toBe(RING_PADDING);
    expect(b.y).toBe(RING_PADDING);
    expect(b.width).toBe(RING_SIZE - 2 * RING_PADDING);
    expect(b.height).toBe(RING_SIZE - 2 * RING_PADDING);
  });
});
