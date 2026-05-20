import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TTS } from '../../src/shared/TTS';

describe('TTS', () => {
  beforeEach(() => {
    (globalThis as any).speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: () => [],
    };
    (globalThis as any).SpeechSynthesisUtterance = class { constructor(public text: string) {} lang = ''; rate = 1; };
  });

  it('isAvailable returns true when SpeechSynthesis exists', () => {
    expect(TTS.isAvailable()).toBe(true);
  });

  it('speak calls speechSynthesis.speak with utterance in zh-TW', () => {
    TTS.speak('雷包');
    expect((globalThis as any).speechSynthesis.speak).toHaveBeenCalled();
    const call = (globalThis as any).speechSynthesis.speak.mock.calls[0][0];
    expect(call.text).toBe('雷包');
    expect(call.lang).toBe('zh-TW');
  });

  it('silently no-ops when SpeechSynthesis missing', () => {
    delete (globalThis as any).speechSynthesis;
    expect(() => TTS.speak('x')).not.toThrow();
  });
});
