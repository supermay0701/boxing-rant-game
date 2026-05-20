import { describe, it, expect } from 'vitest';
import { circlesIntersect } from '../../src/game/HitDetect';

describe('circlesIntersect', () => {
  it('returns true when overlapping', () => {
    expect(circlesIntersect({ x: 0, y: 0, r: 10 }, { x: 5, y: 0, r: 10 })).toBe(true);
  });
  it('returns false when far apart', () => {
    expect(circlesIntersect({ x: 0, y: 0, r: 5 }, { x: 100, y: 0, r: 5 })).toBe(false);
  });
  it('returns true when just touching (sum of radii = distance)', () => {
    expect(circlesIntersect({ x: 0, y: 0, r: 5 }, { x: 10, y: 0, r: 5 })).toBe(true);
  });
  it('returns false when just outside', () => {
    expect(circlesIntersect({ x: 0, y: 0, r: 5 }, { x: 10.1, y: 0, r: 5 })).toBe(false);
  });
});
