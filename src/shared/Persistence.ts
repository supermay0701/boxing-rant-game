const KEY = 'boxing-rant-game:setup-v1';

export interface PersistedJersey {
  type: 'preset' | 'custom';
  primary: string;
  secondary: string;
  bitmapDataUrl?: string;
}

export interface PersistedCharacter {
  name: string;
  avatarDataUrl: string;
  jersey: PersistedJersey;
}

export interface PersistedSetup {
  puncher: PersistedCharacter & { talks: string[] };
  victim:  PersistedCharacter;
}

export function saveSetup(data: PersistedSetup): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[Persistence] save failed:', e);
  }
}

export function loadSetup(): PersistedSetup | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSetup;
  } catch (e) {
    console.warn('[Persistence] load failed:', e);
    return null;
  }
}

export function clearSetup(): void {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    console.warn('[Persistence] clear failed:', e);
  }
}
