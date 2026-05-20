import { describe, it, expect } from 'vitest';
import { Victim } from '../../src/game/Victim';

describe('Victim', () => {
  it('drifts toward puncher over time (net attraction)', () => {
    const v = new Victim(400, 350);
    const startX = v.x;
    for (let t = 0; t < 100; t++) v.update(16, { x: 150, y: 350 });
    expect(v.x).toBeLessThan(startX);  // moved leftward toward puncher
  });

  it('stays within bounds rectangle', () => {
    const v = new Victim(400, 350);
    v.setBounds({ x: 30, y: 30, width: 452, height: 452 });
    for (let t = 0; t < 1000; t++) v.update(16, { x: 200, y: 350 });
    expect(v.x).toBeGreaterThanOrEqual(30);
    expect(v.x).toBeLessThanOrEqual(482);
    expect(v.y).toBeGreaterThanOrEqual(30);
    expect(v.y).toBeLessThanOrEqual(482);
  });

  it('takeHit pushes away from puncher', () => {
    const v = new Victim(300, 350);
    v.takeHit({ x: 200, y: 350 });
    expect(v.x).toBeGreaterThan(300);
  });

  it('increments hitsTaken on takeHit', () => {
    const v = new Victim(300, 350);
    expect(v.hitsTaken).toBe(0);
    v.takeHit({ x: 200, y: 350 });
    expect(v.hitsTaken).toBe(1);
  });
});
