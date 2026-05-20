import { describe, it, expect, vi } from 'vitest';
import { ComboTracker } from '../../src/game/ComboTracker';

describe('ComboTracker', () => {
  it('increments on hit', () => {
    const c = new ComboTracker();
    c.hit(); c.hit();
    expect(c.combo).toBe(2);
  });

  it('resets after timeout window', () => {
    const c = new ComboTracker();
    c.hit();
    c.tick(2000);
    expect(c.combo).toBe(0);
  });

  it('does not reset within timeout window', () => {
    const c = new ComboTracker();
    c.hit();
    c.tick(1000);
    expect(c.combo).toBe(1);
  });

  it('fires onMilestone at 5, 10, 20', () => {
    const fn = vi.fn();
    const c = new ComboTracker(fn);
    for (let i = 0; i < 5; i++) c.hit();
    expect(fn).toHaveBeenCalledWith(5);
    for (let i = 0; i < 5; i++) c.hit();
    expect(fn).toHaveBeenCalledWith(10);
    for (let i = 0; i < 10; i++) c.hit();
    expect(fn).toHaveBeenCalledWith(20);
  });

  it('tracks max combo across resets', () => {
    const c = new ComboTracker();
    c.hit(); c.hit(); c.hit();
    c.tick(2000);
    c.hit();
    expect(c.maxCombo).toBe(3);
  });
});
