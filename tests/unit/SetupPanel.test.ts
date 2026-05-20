import { describe, it, expect } from 'vitest';
import { validateSetupComplete } from '../../src/setup/SetupPanel';

describe('validateSetupComplete', () => {
  it('returns ok when both filled and ≥1 talk', () => {
    expect(validateSetupComplete({
      puncherName: '小明', puncherAvatar: {} as any, puncherJersey: {} as any, puncherTalks: ['雷包'],
      victimName: '阿德', victimAvatar: {} as any, victimJersey: {} as any,
    }).ok).toBe(true);
  });

  it('fails when puncher name empty', () => {
    expect(validateSetupComplete({
      puncherName: '', puncherAvatar: {} as any, puncherJersey: {} as any, puncherTalks: ['x'],
      victimName: 'y', victimAvatar: {} as any, victimJersey: {} as any,
    }).ok).toBe(false);
  });

  it('fails when no talks', () => {
    expect(validateSetupComplete({
      puncherName: 'a', puncherAvatar: {} as any, puncherJersey: {} as any, puncherTalks: [],
      victimName: 'b', victimAvatar: {} as any, victimJersey: {} as any,
    }).ok).toBe(false);
  });

  it('fails when victim avatar missing', () => {
    expect(validateSetupComplete({
      puncherName: 'a', puncherAvatar: {} as any, puncherJersey: {} as any, puncherTalks: ['x'],
      victimName: 'b', victimAvatar: null, victimJersey: {} as any,
    }).ok).toBe(false);
  });
});
