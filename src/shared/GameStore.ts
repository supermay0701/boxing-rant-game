import type { CharacterSetup, JerseyConfig } from '../setup/types';

export interface GameStats {
  totalHits: number;
  maxCombo: number;
  hotZoneStart: number;
  damageLevel: number;
}

export interface StoreState {
  puncher: (CharacterSetup & { talks: string[] }) | null;
  victim:  CharacterSetup | null;
  stats:   GameStats | null;
  recording: Blob | null;
}

type Listener = (key: keyof StoreState) => void;

export class GameStore {
  private state: StoreState = {
    puncher: null,
    victim: null,
    stats: null,
    recording: null,
  };
  private listeners: Set<Listener> = new Set();

  get<K extends keyof StoreState>(key: K): StoreState[K] {
    return this.state[key];
  }

  set<K extends keyof StoreState>(key: K, value: StoreState[K]): void {
    this.state[key] = value;
    this.listeners.forEach(l => l(key));
  }

  on(_event: 'change', listener: Listener): void {
    this.listeners.add(listener);
  }

  off(_event: 'change', listener: Listener): void {
    this.listeners.delete(listener);
  }
}
