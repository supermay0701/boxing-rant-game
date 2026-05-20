import { describe, it, expect } from 'vitest';
import { Puncher, PUNCH_RANGE } from '../../src/game/Puncher';

describe('Puncher state machine', () => {
  it('starts in idle', () => {
    const p = new Puncher(150, 350);
    expect(p.state).toBe('idle');
  });

  it('enters wind_up when victim is in range and not on cooldown', () => {
    const p = new Puncher(150, 350);
    p.update(16, { x: 150 + PUNCH_RANGE - 1, y: 350 });
    expect(p.state).toBe('wind_up');
  });

  it('does not enter wind_up when victim is out of range', () => {
    const p = new Puncher(150, 350);
    p.update(16, { x: 150 + PUNCH_RANGE + 50, y: 350 });
    expect(p.state).toBe('idle');
  });

  it('progresses wind_up → strike → recover → idle over time', () => {
    const p = new Puncher(150, 350);
    p.update(16, { x: 150 + 50, y: 350 });
    expect(p.state).toBe('wind_up');
    p.update(150, { x: 150 + 50, y: 350 });
    expect(p.state).toBe('strike');
    p.update(120, { x: 150 + 50, y: 350 });
    expect(p.state).toBe('recover');
    p.update(250, { x: 150 + 50, y: 350 });
    expect(p.state).toBe('idle');
  });

  it('respects cooldown after recover', () => {
    const p = new Puncher(150, 350);
    p.update(16, { x: 150 + 50, y: 350 });
    p.update(150 + 120 + 250, { x: 150 + 50, y: 350 });   // through to idle
    expect(p.state).toBe('idle');
    p.update(16, { x: 150 + 50, y: 350 });                // still in cooldown
    expect(p.state).toBe('idle');
    p.update(500, { x: 150 + 50, y: 350 });               // cooldown elapsed
    expect(p.state).toBe('wind_up');
  });
});
