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

  preload(): void {
    for (const id of Object.keys(SOURCES) as SoundId[]) {
      if (this.sounds.has(id)) continue;
      const isBgm = id === 'bgm';
      const howl = new Howl({
        src: SOURCES[id],
        loop: isBgm,
        volume: isBgm ? 0.3 : 0.8,
        onloaderror: () => console.warn(`[Audio] failed to load ${id}, using silent fallback`),
      });
      this.sounds.set(id, howl);
    }
  }

  play(id: SoundId): void {
    const s = this.sounds.get(id);
    if (s) s.play();
  }

  stop(id: SoundId): void {
    const s = this.sounds.get(id);
    if (s) s.stop();
  }
}

export const audio = new AudioPlayer();
