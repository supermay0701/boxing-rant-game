import { Howl } from 'howler';

export type SoundId = 'punch' | 'hit' | 'whoosh' | 'bgm';

const SOURCES: Record<SoundId, string[]> = {
  punch:  ['/audio/punch.mp3'],
  hit:    ['/audio/hit.mp3'],
  whoosh: ['/audio/whoosh.mp3'],
  bgm:    ['/audio/bgm.mp3'],
};

export class AudioPlayer {
  private sounds: Map<SoundId, Howl> = new Map();
  private failed: Set<SoundId> = new Set();
  private synthCtx?: AudioContext;

  preload(): void {
    for (const id of Object.keys(SOURCES) as SoundId[]) {
      if (this.sounds.has(id)) continue;
      const isBgm = id === 'bgm';
      const howl = new Howl({
        src: SOURCES[id],
        loop: isBgm,
        volume: isBgm ? 0.3 : 0.8,
        onloaderror: () => {
          this.failed.add(id);
          console.warn(`[Audio] ${id} mp3 missing, using synth fallback`);
        },
      });
      this.sounds.set(id, howl);
    }
  }

  play(id: SoundId): void {
    if (this.failed.has(id)) {
      this.playSynth(id);
      return;
    }
    const s = this.sounds.get(id);
    if (s) s.play();
  }

  stop(id: SoundId): void {
    const s = this.sounds.get(id);
    if (s) s.stop();
  }

  private getSynthCtx(): AudioContext {
    if (!this.synthCtx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.synthCtx = new AC() as AudioContext;
    }
    return this.synthCtx as AudioContext;
  }

  private playSynth(id: SoundId): void {
    if (id === 'bgm') return;  // BGM: just silence in fallback
    const ctx = this.getSynthCtx();
    const now = ctx.currentTime;

    if (id === 'punch') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (id === 'hit') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (id === 'whoosh') {
      // White noise burst with band-pass sweep
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.2);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start(now);
    }
  }
}

export const audio = new AudioPlayer();
