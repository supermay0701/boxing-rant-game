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
  private synthDest?: MediaStreamAudioDestinationNode;

  preload(): void {
    for (const id of Object.keys(SOURCES) as SoundId[]) {
      if (this.sounds.has(id)) continue;
      const isBgm = id === 'bgm';
      const howl = new Howl({
        src: SOURCES[id],
        loop: isBgm,
        volume: isBgm ? 0.15 : 0.8,
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

  getRecordingStream(): MediaStream | null {
    // Synth ctx (created on first play)
    if (!this.synthCtx) {
      // Force-create the synth ctx now
      this.getSynthCtx();
    }
    if (!this.synthDest) {
      this.synthDest = this.synthCtx!.createMediaStreamDestination();
    }

    // Howler's master gain (if Howler is loaded and has played)
    const Howler = (window as any).Howler;
    if (Howler?.masterGain && Howler?.ctx) {
      try {
        // Tee Howler's master into both the original destination AND our recording destination
        // Howler.ctx might be different from our synthCtx — handle separately
        const howlDest = Howler.ctx.createMediaStreamDestination();
        Howler.masterGain.connect(howlDest);
        // Combine tracks from both contexts
        const tracks = [
          ...this.synthDest.stream.getAudioTracks(),
          ...howlDest.stream.getAudioTracks(),
        ];
        return new MediaStream(tracks);
      } catch (e) {
        console.warn('[Audio] failed to combine Howler stream:', e);
      }
    }

    return this.synthDest.stream;
  }

  private getSynthCtx(): AudioContext {
    if (!this.synthCtx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.synthCtx = new AC() as AudioContext;
    }
    return this.synthCtx as AudioContext;
  }

  private connectToOutput(node: AudioNode): void {
    const ctx = this.getSynthCtx();
    node.connect(ctx.destination);
    if (this.synthDest) node.connect(this.synthDest);
  }

  private playSynth(id: SoundId): void {
    if (id === 'bgm') return;  // BGM: just silence in fallback
    const ctx = this.getSynthCtx();
    const now = ctx.currentTime;

    if (id === 'punch') {
      // Thwack: 50ms noise burst with low-pass
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const nd = noiseBuffer.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 800;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.6;
      noise.connect(noiseFilter).connect(noiseGain);
      this.connectToOutput(noiseGain);
      noise.start(now);

      // Sub-bass thump: 150ms sine 90→35Hz
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.frequency.setValueAtTime(90, now);
      sub.frequency.exponentialRampToValueAtTime(35, now + 0.15);
      subGain.gain.setValueAtTime(0.7, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      sub.connect(subGain);
      this.connectToOutput(subGain);
      sub.start(now);
      sub.stop(now + 0.2);
    } else if (id === 'hit') {
      // Square wave body
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(oscGain);
      this.connectToOutput(oscGain);
      osc.start(now);
      osc.stop(now + 0.12);

      // Click attack noise
      const clickBuf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
      const cd = clickBuf.getChannelData(0);
      for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * (1 - i / cd.length);
      const click = ctx.createBufferSource();
      click.buffer = clickBuf;
      const clickGain = ctx.createGain();
      clickGain.gain.value = 0.5;
      click.connect(clickGain);
      this.connectToOutput(clickGain);
      click.start(now);
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
      noise.connect(filter).connect(gain);
      this.connectToOutput(gain);
      noise.start(now);
    }
  }
}

export const audio = new AudioPlayer();
