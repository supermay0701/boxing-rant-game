import { describe, it, expect, beforeEach } from 'vitest';
import { saveSetup, loadSetup, clearSetup, type PersistedSetup } from '../../src/shared/Persistence';

describe('Persistence', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips puncher + victim names and talks', () => {
    const input: PersistedSetup = {
      puncher: { name: '小明', avatarDataUrl: 'data:,a', jersey: { type: 'preset', primary: '#fff', secondary: '#000' }, talks: ['雷包'] },
      victim:  { name: '阿德', avatarDataUrl: 'data:,b', jersey: { type: 'preset', primary: '#f00', secondary: '#0f0' } },
    };
    saveSetup(input);
    const out = loadSetup();
    expect(out).toEqual(input);
  });

  it('returns null when nothing saved', () => {
    expect(loadSetup()).toBeNull();
  });

  it('clearSetup removes data', () => {
    saveSetup({ puncher: { name: 'x', avatarDataUrl: 'data:,', jersey: { type: 'preset', primary: '#000', secondary: '#fff' }, talks: [] }, victim: { name: 'y', avatarDataUrl: 'data:,', jersey: { type: 'preset', primary: '#000', secondary: '#fff' } } });
    clearSetup();
    expect(loadSetup()).toBeNull();
  });

  it('returns null gracefully on quota exceeded', () => {
    const old = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException('Quota', 'QuotaExceededError'); };
    expect(() => saveSetup({ puncher: { name: 'x', avatarDataUrl: 'data:,', jersey: { type: 'preset', primary: '#000', secondary: '#fff' }, talks: [] }, victim: { name: 'y', avatarDataUrl: 'data:,', jersey: { type: 'preset', primary: '#000', secondary: '#fff' } } })).not.toThrow();
    Storage.prototype.setItem = old;
  });
});
