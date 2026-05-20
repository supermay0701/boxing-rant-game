import { describe, it, expect, vi } from 'vitest';
import { Timer } from '../../src/game/Timer';

describe('Timer', () => {
  it('counts down deltaMs', () => {
    const t = new Timer(1000);
    t.tick(300);
    expect(t.remainingMs).toBe(700);
  });

  it('clamps at 0', () => {
    const t = new Timer(100);
    t.tick(500);
    expect(t.remainingMs).toBe(0);
  });

  it('fires onComplete exactly once', () => {
    const done = vi.fn();
    const t = new Timer(100, done);
    t.tick(50); expect(done).not.toHaveBeenCalled();
    t.tick(50); expect(done).toHaveBeenCalledTimes(1);
    t.tick(50); expect(done).toHaveBeenCalledTimes(1);
  });
});
