import { describe, it, expect, vi } from 'vitest';
import { GameStore } from '../../src/shared/GameStore';

describe('GameStore', () => {
  it('emits change when set is called', () => {
    const store = new GameStore();
    const listener = vi.fn();
    store.on('change', listener);
    store.set('puncher', null);
    expect(listener).toHaveBeenCalledWith('puncher');
  });

  it('returns value from get', () => {
    const store = new GameStore();
    store.set('victim', null);
    expect(store.get('victim')).toBeNull();
  });

  it('supports off to unsubscribe', () => {
    const store = new GameStore();
    const listener = vi.fn();
    store.on('change', listener);
    store.off('change', listener);
    store.set('puncher', null);
    expect(listener).not.toHaveBeenCalled();
  });
});
