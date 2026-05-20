# 嘴砲擂台小遊戲 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 60-second browser game where a customizable cartoon boxer beats up a customizable cartoon victim while trash-talking, with full recording playback.

**Architecture:** Single-page Vite + TypeScript app, three screens (Setup/Game/Replay) toggled via display, shared GameStore with localStorage sync. Canvas 2D for game rendering, Web Workers for image filtering, MediaRecorder for replay.

**Tech Stack:** TypeScript, Vite, HTML5 Canvas 2D, Howler.js, Web Speech API, MediaRecorder API, Vitest, Playwright.

**Spec:** [docs/superpowers/specs/2026-05-21-boxing-rant-game-design.md](../specs/2026-05-21-boxing-rant-game-design.md)

---

## Phase 0 — Project Setup

### Task 1: Initialize Vite + TypeScript project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
git init
git branch -M main
```

- [ ] **Step 2: Create package.json**

```bash
npm init -y
```

Then edit `package.json` to add scripts:

```json
{
  "name": "boxing-rant-game",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install --save-dev vite typescript @types/node vitest jsdom @vitest/ui @playwright/test
npm install howler
npm install --save-dev @types/howler
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

- [ ] **Step 6: Create skeleton index.html**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>嘴砲擂台</title>
  <link rel="stylesheet" href="/src/styles.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 7: Create stub src/main.ts**

```ts
const app = document.getElementById('app');
if (app) app.textContent = '嘴砲擂台 — 開發中';
```

- [ ] **Step 8: Create src/styles.css**

```css
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: -apple-system, "Segoe UI", "Microsoft JhengHei", sans-serif; background: #0e1015; color: #eee; }
#app { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
```

- [ ] **Step 9: Create .gitignore**

```
node_modules
dist
.vite
.DS_Store
.env
.env.local
coverage
playwright-report
test-results
```

- [ ] **Step 10: Verify dev server runs**

```bash
npm run dev
```

Expected: server starts at `http://localhost:5173`, page shows "嘴砲擂台 — 開發中". Stop with Ctrl+C.

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "chore: init vite + ts project"
```

---

### Task 2: Create directory structure

**Files:**
- Create empty placeholder folders matching spec § 4

- [ ] **Step 1: Create directories**

```bash
mkdir -p src/setup src/game src/replay src/shared public/audio public/jerseys tests/unit tests/e2e
```

- [ ] **Step 2: Add .gitkeep to empty dirs**

```bash
touch src/setup/.gitkeep src/game/.gitkeep src/replay/.gitkeep src/shared/.gitkeep
touch public/audio/.gitkeep public/jerseys/.gitkeep tests/unit/.gitkeep tests/e2e/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: scaffold directory structure"
```

---

## Phase 1 — Shared Utilities

### Task 3: GameStore with EventEmitter

**Files:**
- Create: `src/shared/GameStore.ts`
- Test: `tests/unit/GameStore.test.ts`

- [ ] **Step 1: Write failing test for set/get + change event**

`tests/unit/GameStore.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- GameStore --run
```

Expected: FAIL `Cannot find module .../GameStore`

- [ ] **Step 3: Implement GameStore**

`src/shared/GameStore.ts`:

```ts
import type { CharacterSetup, JerseyConfig } from '../setup/types';

export interface GameStats {
  totalHits: number;
  maxCombo: number;
  hotZoneStart: number;  // ms timestamp of densest 10s window start
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
```

Also create stub `src/setup/types.ts`:

```ts
export interface CharacterSetup {
  name: string;
  avatar: ImageBitmap;
  jersey: JerseyConfig;
}

export type JerseyConfig =
  | { type: 'preset'; primary: string; secondary: string }
  | { type: 'custom'; bitmap: ImageBitmap };

export interface SetupData {
  puncher: CharacterSetup & { talks: string[] };
  victim:  CharacterSetup;
  duration: number;
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- GameStore --run
```

Expected: PASS 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/shared/GameStore.ts src/setup/types.ts tests/unit/GameStore.test.ts
git commit -m "feat(shared): add GameStore with EventEmitter pattern"
```

---

### Task 4: Persistence (localStorage)

**Files:**
- Create: `src/shared/Persistence.ts`
- Test: `tests/unit/Persistence.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/Persistence.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- Persistence --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Persistence**

`src/shared/Persistence.ts`:

```ts
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
```

Note: the jersey persisted shape always has `primary`/`secondary` (defaults) for round-trip simplicity; preset uses them directly, custom uses `bitmapDataUrl` for the image. Test data above matches this shape.

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- Persistence --run
```

Expected: PASS 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/shared/Persistence.ts tests/unit/Persistence.test.ts
git commit -m "feat(shared): add localStorage persistence layer"
```

---

### Task 5: TTS wrapper (Web Speech API)

**Files:**
- Create: `src/shared/TTS.ts`
- Test: `tests/unit/TTS.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/TTS.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- TTS --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement TTS**

`src/shared/TTS.ts`:

```ts
export class TTS {
  static isAvailable(): boolean {
    return typeof globalThis.speechSynthesis !== 'undefined'
        && typeof globalThis.SpeechSynthesisUtterance !== 'undefined';
  }

  static speak(text: string): void {
    if (!TTS.isAvailable()) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    u.rate = 1.1;
    speechSynthesis.speak(u);
  }

  static cancel(): void {
    if (!TTS.isAvailable()) return;
    speechSynthesis.cancel();
  }
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- TTS --run
```

Expected: PASS 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/shared/TTS.ts tests/unit/TTS.test.ts
git commit -m "feat(shared): add TTS wrapper around Web Speech API"
```

---

### Task 6: Audio wrapper (Howler stub)

**Files:**
- Create: `src/shared/Audio.ts`

- [ ] **Step 1: Implement Audio wrapper**

`src/shared/Audio.ts`:

```ts
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
```

- [ ] **Step 2: Add silent placeholder audio files**

For v1 we'll commit empty placeholder files (Howler logs warning but doesn't break):

```bash
touch public/audio/punch.mp3 public/audio/hit.mp3 public/audio/whoosh.mp3 public/audio/bgm.mp3
```

Note for implementer: real audio can be dropped in later from freesound.org; the file names are stable.

- [ ] **Step 3: Commit**

```bash
git add src/shared/Audio.ts public/audio/
git commit -m "feat(shared): add Howler-backed AudioPlayer with placeholder files"
```

---

### Task 7: CartoonFilter — posterize utility

**Files:**
- Create: `src/shared/CartoonFilter.ts`
- Test: `tests/unit/CartoonFilter.test.ts`

- [ ] **Step 1: Write failing test for posterize**

`tests/unit/CartoonFilter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { posterize } from '../../src/shared/CartoonFilter';

describe('CartoonFilter.posterize', () => {
  it('quantizes channel values to 6 buckets', () => {
    // 6 buckets => bucket size = 256/6 ≈ 42.67
    // value 0  → 0
    // value 50 → floor(50/42.67) * 42.67 ≈ 42
    // value 200 → floor(200/42.67) * 42.67 ≈ 170
    const input = new Uint8ClampedArray([0, 50, 200, 255, 0, 0, 0, 255]); // 2 pixels (RGBA)
    posterize(input, 6);
    expect(input[0]).toBe(0);
    expect(input[1]).toBe(42);
    expect(input[2]).toBe(170);
    expect(input[3]).toBe(255);            // alpha preserved
    expect(input[7]).toBe(255);            // alpha preserved
  });

  it('preserves array length', () => {
    const arr = new Uint8ClampedArray(40);
    posterize(arr, 6);
    expect(arr.length).toBe(40);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- CartoonFilter --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement posterize + skeleton**

`src/shared/CartoonFilter.ts`:

```ts
const POSTERIZE_LEVELS = 6;
const SATURATION = 1.6;
const EDGE_THRESHOLD = 90;
const TARGET_SIZE = 256;

export function posterize(data: Uint8ClampedArray, levels: number): void {
  const bucket = 256 / levels;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.floor(data[i]     / bucket) * bucket;
    data[i + 1] = Math.floor(data[i + 1] / bucket) * bucket;
    data[i + 2] = Math.floor(data[i + 2] / bucket) * bucket;
    // alpha (i+3) untouched
  }
}

export async function applyCartoonFilter(file: File): Promise<ImageBitmap> {
  // Implementation in Task 8
  throw new Error('not implemented');
}

// Exported for use in Task 8 / future:
export const _config = { POSTERIZE_LEVELS, SATURATION, EDGE_THRESHOLD, TARGET_SIZE };
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- CartoonFilter --run
```

Expected: PASS 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/shared/CartoonFilter.ts tests/unit/CartoonFilter.test.ts
git commit -m "feat(shared): add posterize step of cartoon filter"
```

---

### Task 8: CartoonFilter — full pipeline (resize / saturate / edge / circle mask)

**Files:**
- Modify: `src/shared/CartoonFilter.ts`
- Test: `tests/unit/CartoonFilter.test.ts` (add integration test)

- [ ] **Step 1: Add Sobel edge utility test**

Append to `tests/unit/CartoonFilter.test.ts`:

```ts
import { sobelEdges } from '../../src/shared/CartoonFilter';

describe('CartoonFilter.sobelEdges', () => {
  it('detects edges on a high-contrast 4x4 image', () => {
    // 4x4 image, left half black, right half white
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const i = (y * 4 + x) * 4;
        const v = x < 2 ? 0 : 255;
        data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
      }
    }
    const edges = sobelEdges(data, 4, 4);
    // Column 1-2 boundary should have high edge magnitude
    expect(edges[1 * 4 + 1]).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- CartoonFilter --run
```

Expected: FAIL — `sobelEdges` not exported.

- [ ] **Step 3: Add sobelEdges + applyCartoonFilter**

Replace `src/shared/CartoonFilter.ts`:

```ts
const POSTERIZE_LEVELS = 6;
const SATURATION = 1.6;
const EDGE_THRESHOLD = 90;
const TARGET_SIZE = 256;

export function posterize(data: Uint8ClampedArray, levels: number): void {
  const bucket = 256 / levels;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.floor(data[i]     / bucket) * bucket;
    data[i + 1] = Math.floor(data[i + 1] / bucket) * bucket;
    data[i + 2] = Math.floor(data[i + 2] / bucket) * bucket;
  }
}

/** Returns Uint8Array of edge magnitudes (grayscale), same width*height as input. */
export function sobelEdges(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const gray = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    gray[j] = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) | 0;
  }
  const at = (x: number, y: number) => gray[y * w + x];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx = -at(x-1,y-1) -2*at(x-1,y) -at(x-1,y+1) + at(x+1,y-1) +2*at(x+1,y) + at(x+1,y+1);
      const gy = -at(x-1,y-1) -2*at(x,y-1) -at(x+1,y-1) + at(x-1,y+1) +2*at(x,y+1) + at(x+1,y+1);
      out[y * w + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy) | 0);
    }
  }
  return out;
}

/**
 * Apply full cartoon pipeline: resize → saturate → posterize → sobel overlay → circle mask.
 * Returns 256x256 ImageBitmap with transparent background outside circle.
 * Falls back to plain circle crop if OffscreenCanvas isn't available.
 */
export async function applyCartoonFilter(file: File): Promise<ImageBitmap> {
  const bitmap = await createImageBitmap(file);

  if (typeof OffscreenCanvas === 'undefined') {
    return circleCropFallback(bitmap);
  }

  // Step 1: resize 256x256 + saturate via ctx.filter
  const off = new OffscreenCanvas(TARGET_SIZE, TARGET_SIZE);
  const ctx = off.getContext('2d')!;
  ctx.filter = `saturate(${SATURATION})`;
  ctx.drawImage(bitmap, 0, 0, TARGET_SIZE, TARGET_SIZE);
  ctx.filter = 'none';

  // Step 2: posterize on pixel buffer
  const img = ctx.getImageData(0, 0, TARGET_SIZE, TARGET_SIZE);
  posterize(img.data, POSTERIZE_LEVELS);

  // Step 3: sobel edges → overlay black where edge > threshold
  const edges = sobelEdges(img.data, TARGET_SIZE, TARGET_SIZE);
  for (let i = 0, j = 0; i < img.data.length; i += 4, j++) {
    if (edges[j] > EDGE_THRESHOLD) {
      img.data[i] = 0; img.data[i + 1] = 0; img.data[i + 2] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Step 4: circle mask
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.arc(TARGET_SIZE / 2, TARGET_SIZE / 2, TARGET_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  return off.transferToImageBitmap();
}

async function circleCropFallback(bitmap: ImageBitmap): Promise<ImageBitmap> {
  const c = document.createElement('canvas');
  c.width = TARGET_SIZE; c.height = TARGET_SIZE;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, TARGET_SIZE, TARGET_SIZE);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.arc(TARGET_SIZE / 2, TARGET_SIZE / 2, TARGET_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  return createImageBitmap(c);
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- CartoonFilter --run
```

Expected: PASS 3 tests (posterize × 2 + sobel × 1)

- [ ] **Step 5: Commit**

```bash
git add src/shared/CartoonFilter.ts tests/unit/CartoonFilter.test.ts
git commit -m "feat(shared): complete cartoon filter pipeline (sobel + circle mask)"
```

---

## Phase 2 — Setup Screen

### Task 9: index.html shell + screen routing in main.ts

**Files:**
- Modify: `index.html`
- Modify: `src/main.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Update index.html with three screen containers**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>嘴砲擂台</title>
  <link rel="stylesheet" href="/src/styles.css" />
</head>
<body>
  <div id="compat-banner" hidden></div>
  <div id="app">
    <div id="screen-setup"  class="screen"></div>
    <div id="screen-game"   class="screen" hidden></div>
    <div id="screen-replay" class="screen" hidden></div>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Update main.ts with screen switcher**

```ts
import { GameStore } from './shared/GameStore';

export type Screen = 'setup' | 'game' | 'replay';

export const store = new GameStore();

function showScreen(name: Screen) {
  for (const s of ['setup', 'game', 'replay'] as Screen[]) {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.hidden = s !== name;
  }
}

(window as any).showScreen = showScreen; // dev convenience
showScreen('setup');

const setupEl = document.getElementById('screen-setup');
if (setupEl) setupEl.textContent = '(Setup 畫面)';
```

- [ ] **Step 3: Update styles.css**

```css
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: -apple-system, "Segoe UI", "Microsoft JhengHei", sans-serif; background: #0e1015; color: #eee; min-height: 100vh; }
#app { min-height: 100vh; }
.screen[hidden] { display: none; }
.screen { min-height: 100vh; padding: 20px; }

#compat-banner {
  background: #fff3cd; color: #856404; padding: 8px 16px;
  text-align: center; border-bottom: 1px solid #ffeaa7;
  font-size: 13px;
}
#compat-banner[hidden] { display: none; }
```

- [ ] **Step 4: Verify visually**

```bash
npm run dev
```

Open http://localhost:5173 — should see "(Setup 畫面)" only. In console: `window.showScreen('game')` should switch to empty game screen.

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.ts src/styles.css
git commit -m "feat: add three-screen shell + screen router"
```

---

### Task 10: NameField component

**Files:**
- Create: `src/setup/NameField.ts`
- Test: `tests/unit/NameField.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/NameField.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { NameField } from '../../src/setup/NameField';

describe('NameField', () => {
  it('renders input with placeholder', () => {
    const root = document.createElement('div');
    const f = new NameField(root, '小明');
    expect(root.querySelector('input')).not.toBeNull();
    expect((root.querySelector('input') as HTMLInputElement).value).toBe('小明');
  });

  it('emits change on input', () => {
    const root = document.createElement('div');
    const onChange = vi.fn();
    const f = new NameField(root, '');
    f.onChange(onChange);
    const input = root.querySelector('input') as HTMLInputElement;
    input.value = '阿德';
    input.dispatchEvent(new Event('input'));
    expect(onChange).toHaveBeenCalledWith('阿德');
  });

  it('truncates input to 10 chars', () => {
    const root = document.createElement('div');
    const f = new NameField(root, '');
    const input = root.querySelector('input') as HTMLInputElement;
    expect(input.maxLength).toBe(10);
  });

  it('renders disclaimer badge', () => {
    const root = document.createElement('div');
    new NameField(root, '');
    expect(root.textContent).toContain('純屬虛構');
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- NameField --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement NameField**

`src/setup/NameField.ts`:

```ts
type ChangeHandler = (name: string) => void;

export class NameField {
  private handler: ChangeHandler = () => {};
  private input: HTMLInputElement;

  constructor(root: HTMLElement, initial: string) {
    root.innerHTML = `
      <div class="field-block">
        <div class="field-label">
          <span>角色命名</span>
          <span class="disclaimer">⚠ 純屬虛構搞笑，與真實世界無關</span>
        </div>
        <input class="input-mock" type="text" maxlength="10" placeholder="輸入名字（1–10 字）" />
      </div>
    `;
    this.input = root.querySelector('input')!;
    this.input.value = initial;
    this.input.addEventListener('input', () => this.handler(this.input.value));
  }

  onChange(handler: ChangeHandler): void {
    this.handler = handler;
  }

  value(): string {
    return this.input.value;
  }
}
```

- [ ] **Step 4: Add styles**

Append to `src/styles.css`:

```css
.field-block { background: #2a2e42; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.field-label { font-size: 12px; color: #aaa; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
.disclaimer { background: #3a2810; color: #ffb74d; border: 1px solid #f57c00; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: normal; }
.input-mock { background: #1a1d2a; border: 1px solid #444; border-radius: 4px; padding: 8px 10px; color: #fff; width: 100%; font-size: 13px; }
```

- [ ] **Step 5: Run test, confirm pass**

```bash
npm run test -- NameField --run
```

Expected: PASS 4 tests

- [ ] **Step 6: Commit**

```bash
git add src/setup/NameField.ts tests/unit/NameField.test.ts src/styles.css
git commit -m "feat(setup): add NameField component with disclaimer badge"
```

---

### Task 11: AvatarUploader (file → CartoonFilter → preview)

**Files:**
- Create: `src/setup/AvatarUploader.ts`
- Test: `tests/unit/AvatarUploader.test.ts`

- [ ] **Step 1: Write failing test (validation only — full bitmap flow needs jsdom polyfill)**

`tests/unit/AvatarUploader.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateImageFile } from '../../src/setup/AvatarUploader';

describe('validateImageFile', () => {
  it('rejects files > 5MB', () => {
    const f = new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(f).ok).toBe(false);
  });

  it('rejects non-image files', () => {
    const f = new File(['x'], 'a.txt', { type: 'text/plain' });
    expect(validateImageFile(f).ok).toBe(false);
  });

  it('accepts small jpeg', () => {
    const f = new File([new Uint8Array(100)], 'small.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(f).ok).toBe(true);
  });

  it('accepts png and webp', () => {
    expect(validateImageFile(new File(['x'], 'a.png', { type: 'image/png' })).ok).toBe(true);
    expect(validateImageFile(new File(['x'], 'a.webp', { type: 'image/webp' })).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- AvatarUploader --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement AvatarUploader**

`src/setup/AvatarUploader.ts`:

```ts
import { applyCartoonFilter } from '../shared/CartoonFilter';

type ChangeHandler = (bitmap: ImageBitmap) => void;

const MAX_SIZE = 5 * 1024 * 1024;
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): { ok: boolean; error?: string } {
  if (!VALID_TYPES.includes(file.type)) return { ok: false, error: '請選 jpg/png/webp' };
  if (file.size > MAX_SIZE) return { ok: false, error: '檔案需小於 5MB' };
  return { ok: true };
}

export class AvatarUploader {
  private handler: ChangeHandler = () => {};
  private root: HTMLElement;
  private error: HTMLElement;
  private preview: HTMLCanvasElement;

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = `
      <div class="field-block">
        <div class="field-label">頭像</div>
        <div style="display:flex;gap:10px;align-items:center">
          <canvas class="avatar-preview" width="64" height="64"></canvas>
          <label class="add-talk" style="flex:1;height:64px;cursor:pointer;display:flex;align-items:center;justify-content:center">
            ＋ 上傳照片
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden />
          </label>
        </div>
        <div class="error-text" style="color:#ff6b6b;font-size:11px;margin-top:6px" hidden></div>
      </div>
    `;
    this.preview = root.querySelector('canvas.avatar-preview')!;
    this.error = root.querySelector('.error-text') as HTMLElement;
    const input = root.querySelector('input[type=file]') as HTMLInputElement;
    input.addEventListener('change', () => this.handleFile(input.files?.[0]));
  }

  private async handleFile(file?: File): Promise<void> {
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.ok) { this.showError(v.error!); return; }
    this.hideError();
    try {
      const bitmap = await applyCartoonFilter(file);
      this.drawPreview(bitmap);
      this.handler(bitmap);
    } catch (e) {
      console.warn('[AvatarUploader] filter failed:', e);
      this.showError('影像處理失敗，請換一張');
    }
  }

  private drawPreview(bitmap: ImageBitmap): void {
    const ctx = this.preview.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(bitmap, 0, 0, 64, 64);
  }

  private showError(msg: string): void {
    this.error.textContent = msg;
    this.error.hidden = false;
  }

  private hideError(): void {
    this.error.hidden = true;
  }

  onChange(h: ChangeHandler): void { this.handler = h; }
}
```

- [ ] **Step 4: Add styles**

Append to `src/styles.css`:

```css
.avatar-preview { width: 64px; height: 64px; background: #1a1d2a; border: 2px solid #4a7cff; border-radius: 50%; }
.add-talk { background: transparent; border: 1px dashed #4a7cff; color: #4a7cff; padding: 6px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; }
```

- [ ] **Step 5: Run test, confirm pass**

```bash
npm run test -- AvatarUploader --run
```

Expected: PASS 4 tests

- [ ] **Step 6: Commit**

```bash
git add src/setup/AvatarUploader.ts tests/unit/AvatarUploader.test.ts src/styles.css
git commit -m "feat(setup): add AvatarUploader with validation + cartoon filter"
```

---

### Task 12: JerseyPicker (6 presets + upload)

**Files:**
- Create: `src/setup/JerseyPicker.ts`
- Test: `tests/unit/JerseyPicker.test.ts`

- [ ] **Step 1: Define presets constant**

Create `src/setup/jerseyPresets.ts`:

```ts
export interface JerseyPreset {
  id: string;
  primary: string;
  secondary: string;
}

export const JERSEY_PRESETS: JerseyPreset[] = [
  { id: 'pp', primary: '#7E57C2', secondary: '#FFD54F' },
  { id: 'rb', primary: '#E53935', secondary: '#1A1A1A' },
  { id: 'bw', primary: '#1976D2', secondary: '#FFFFFF' },
  { id: 'go', primary: '#43A047', secondary: '#FB8C00' },
  { id: 'kb', primary: '#EC407A', secondary: '#29B6F6' },
  { id: 'bg', primary: '#212121', secondary: '#FFC107' },
];
```

- [ ] **Step 2: Write failing test**

`tests/unit/JerseyPicker.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { JerseyPicker } from '../../src/setup/JerseyPicker';
import { JERSEY_PRESETS } from '../../src/setup/jerseyPresets';

describe('JerseyPicker', () => {
  it('renders 6 preset swatches + 1 upload button', () => {
    const root = document.createElement('div');
    new JerseyPicker(root);
    expect(root.querySelectorAll('.preset-thumb').length).toBe(6);
    expect(root.querySelectorAll('.upload-jersey').length).toBe(1);
  });

  it('first preset selected by default', () => {
    const root = document.createElement('div');
    const p = new JerseyPicker(root);
    expect(p.value()).toEqual({ type: 'preset', primary: JERSEY_PRESETS[0].primary, secondary: JERSEY_PRESETS[0].secondary });
  });

  it('clicking a swatch updates value and emits change', () => {
    const root = document.createElement('div');
    const p = new JerseyPicker(root);
    const handler = vi.fn();
    p.onChange(handler);
    const thumbs = root.querySelectorAll('.preset-thumb');
    (thumbs[2] as HTMLElement).click();
    expect(handler).toHaveBeenCalledWith({ type: 'preset', primary: JERSEY_PRESETS[2].primary, secondary: JERSEY_PRESETS[2].secondary });
  });
});
```

- [ ] **Step 3: Run test, confirm fail**

```bash
npm run test -- JerseyPicker --run
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement JerseyPicker**

`src/setup/JerseyPicker.ts`:

```ts
import { JERSEY_PRESETS } from './jerseyPresets';
import type { JerseyConfig } from './types';

type ChangeHandler = (cfg: JerseyConfig) => void;

export class JerseyPicker {
  private current: JerseyConfig;
  private handler: ChangeHandler = () => {};
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.current = { type: 'preset', primary: JERSEY_PRESETS[0].primary, secondary: JERSEY_PRESETS[0].secondary };
    this.render();
  }

  private render(): void {
    const swatches = JERSEY_PRESETS.map((p, i) => `
      <div class="preset-thumb${i === 0 ? ' selected' : ''}" data-idx="${i}"
           style="background:linear-gradient(135deg, ${p.primary} 0 50%, ${p.secondary} 50% 100%)"></div>
    `).join('');

    this.root.innerHTML = `
      <div class="field-block">
        <div class="field-label">服裝 — 選預設或上傳自製球衣圖</div>
        <div class="preset-row">
          ${swatches}
          <label class="upload-jersey" title="上傳自製球衣">＋
            <input type="file" accept="image/*" hidden />
          </label>
        </div>
      </div>
    `;

    this.root.querySelectorAll<HTMLElement>('.preset-thumb').forEach(el => {
      el.addEventListener('click', () => this.selectPreset(Number(el.dataset.idx)));
    });

    const fileInput = this.root.querySelector('input[type=file]') as HTMLInputElement;
    fileInput.addEventListener('change', () => this.handleUpload(fileInput.files?.[0]));
  }

  private selectPreset(idx: number): void {
    const p = JERSEY_PRESETS[idx];
    this.current = { type: 'preset', primary: p.primary, secondary: p.secondary };
    this.root.querySelectorAll<HTMLElement>('.preset-thumb').forEach(el => el.classList.remove('selected'));
    this.root.querySelectorAll<HTMLElement>('.preset-thumb')[idx].classList.add('selected');
    this.handler(this.current);
  }

  private async handleUpload(file?: File): Promise<void> {
    if (!file) return;
    const bitmap = await createImageBitmap(file);
    this.current = { type: 'custom', bitmap };
    this.handler(this.current);
  }

  value(): JerseyConfig { return this.current; }
  onChange(h: ChangeHandler): void { this.handler = h; }
}
```

- [ ] **Step 5: Add styles**

Append to `src/styles.css`:

```css
.preset-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.preset-thumb { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #555; cursor: pointer; }
.preset-thumb.selected { border: 2px solid #4a7cff; box-shadow: 0 0 0 1px #4a7cff inset; }
.upload-jersey { width: 32px; height: 32px; border-radius: 6px; border: 2px dashed #4a7cff; color: #4a7cff; background: #1a1d2a; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; }
```

- [ ] **Step 6: Run test, confirm pass**

```bash
npm run test -- JerseyPicker --run
```

Expected: PASS 3 tests

- [ ] **Step 7: Commit**

```bash
git add src/setup/JerseyPicker.ts src/setup/jerseyPresets.ts tests/unit/JerseyPicker.test.ts src/styles.css
git commit -m "feat(setup): add JerseyPicker with 6 presets and custom upload"
```

---

### Task 13: TrashTalkEditor

**Files:**
- Create: `src/setup/TrashTalkEditor.ts`
- Test: `tests/unit/TrashTalkEditor.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/TrashTalkEditor.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { TrashTalkEditor } from '../../src/setup/TrashTalkEditor';

describe('TrashTalkEditor', () => {
  it('starts with one empty line', () => {
    const root = document.createElement('div');
    const e = new TrashTalkEditor(root, []);
    expect(root.querySelectorAll('input.talk').length).toBe(1);
  });

  it('add button creates new line up to 5', () => {
    const root = document.createElement('div');
    new TrashTalkEditor(root, []);
    const add = root.querySelector('.add-talk-btn') as HTMLButtonElement;
    add.click(); add.click(); add.click(); add.click();
    expect(root.querySelectorAll('input.talk').length).toBe(5);
    expect(add.disabled).toBe(true);
  });

  it('input caps at 15 chars via maxlength', () => {
    const root = document.createElement('div');
    new TrashTalkEditor(root, []);
    const input = root.querySelector('input.talk') as HTMLInputElement;
    expect(input.maxLength).toBe(15);
  });

  it('value() returns non-empty trimmed talks', () => {
    const root = document.createElement('div');
    const e = new TrashTalkEditor(root, ['雷包', '', '罰球不進  ']);
    expect(e.value()).toEqual(['雷包', '罰球不進']);
  });

  it('emits change when input fires', () => {
    const root = document.createElement('div');
    const e = new TrashTalkEditor(root, ['初始']);
    const handler = vi.fn();
    e.onChange(handler);
    const input = root.querySelector('input.talk') as HTMLInputElement;
    input.value = '改了';
    input.dispatchEvent(new Event('input'));
    expect(handler).toHaveBeenCalledWith(['改了']);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- TrashTalkEditor --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement TrashTalkEditor**

`src/setup/TrashTalkEditor.ts`:

```ts
type ChangeHandler = (talks: string[]) => void;
const MAX_LINES = 5;
const MAX_CHARS = 15;

export class TrashTalkEditor {
  private lines: string[];
  private handler: ChangeHandler = () => {};
  private root: HTMLElement;

  constructor(root: HTMLElement, initial: string[]) {
    this.root = root;
    this.lines = initial.length > 0 ? initial.slice(0, MAX_LINES) : [''];
    this.render();
  }

  private render(): void {
    const lineHtml = this.lines.map((text, i) => `
      <div class="talk-line">
        <input class="talk" type="text" maxlength="${MAX_CHARS}" placeholder="第 ${i + 1} 句（最多 ${MAX_CHARS} 字）" value="${escapeHtml(text)}" data-idx="${i}" />
        <span class="count" data-count-for="${i}">${text.length}/${MAX_CHARS}</span>
      </div>
    `).join('');

    this.root.innerHTML = `
      <div class="field-block">
        <div class="field-label">嗆聲台詞（最多 ${MAX_LINES} 句、每句 ${MAX_CHARS} 字）</div>
        ${lineHtml}
        <button class="add-talk-btn" type="button">＋ 新增一句</button>
      </div>
    `;

    this.root.querySelectorAll<HTMLInputElement>('input.talk').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.idx);
        this.lines[idx] = input.value;
        const counter = this.root.querySelector(`[data-count-for="${idx}"]`);
        if (counter) counter.textContent = `${input.value.length}/${MAX_CHARS}`;
        this.handler(this.value());
      });
    });

    const addBtn = this.root.querySelector('.add-talk-btn') as HTMLButtonElement;
    if (this.lines.length >= MAX_LINES) addBtn.disabled = true;
    addBtn.addEventListener('click', () => {
      if (this.lines.length >= MAX_LINES) return;
      this.lines.push('');
      this.render();
      this.handler(this.value());
    });
  }

  value(): string[] {
    return this.lines.map(s => s.trim()).filter(s => s.length > 0);
  }

  onChange(h: ChangeHandler): void { this.handler = h; }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
```

- [ ] **Step 4: Add styles**

Append to `src/styles.css`:

```css
.talk-line { background: #1a1d2a; border: 1px solid #444; border-radius: 4px; padding: 5px 8px; margin-bottom: 3px; display: flex; gap: 8px; align-items: center; }
.talk-line input.talk { flex: 1; background: transparent; border: none; color: #fff; font-size: 12px; outline: none; }
.talk-line .count { color: #666; font-size: 9px; }
.add-talk-btn { background: transparent; border: 1px dashed #4a7cff; color: #4a7cff; padding: 5px 8px; border-radius: 4px; font-size: 11px; width: 100%; cursor: pointer; margin-top: 4px; }
.add-talk-btn:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 5: Run test, confirm pass**

```bash
npm run test -- TrashTalkEditor --run
```

Expected: PASS 5 tests

- [ ] **Step 6: Commit**

```bash
git add src/setup/TrashTalkEditor.ts tests/unit/TrashTalkEditor.test.ts src/styles.css
git commit -m "feat(setup): add TrashTalkEditor with 5-line/15-char limits"
```

---

### Task 14: SetupPanel (Tab orchestrator + 開打 button)

**Files:**
- Create: `src/setup/SetupPanel.ts`
- Test: `tests/unit/SetupPanel.test.ts`

- [ ] **Step 1: Write failing test for validation**

`tests/unit/SetupPanel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateSetupComplete } from '../../src/setup/SetupPanel';

describe('validateSetupComplete', () => {
  const validChar = { name: '阿', avatar: {} as any, jersey: { type: 'preset', primary: '#000', secondary: '#fff' } as any };

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
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- SetupPanel --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement SetupPanel + validation**

`src/setup/SetupPanel.ts`:

```ts
import { NameField } from './NameField';
import { AvatarUploader } from './AvatarUploader';
import { JerseyPicker } from './JerseyPicker';
import { TrashTalkEditor } from './TrashTalkEditor';
import type { SetupData, JerseyConfig } from './types';

export interface RawSetupState {
  puncherName: string;
  puncherAvatar: ImageBitmap | null;
  puncherJersey: JerseyConfig | null;
  puncherTalks: string[];
  victimName: string;
  victimAvatar: ImageBitmap | null;
  victimJersey: JerseyConfig | null;
}

export function validateSetupComplete(s: RawSetupState): { ok: boolean; missing?: string } {
  if (!s.puncherName.trim()) return { ok: false, missing: '扁人者名字' };
  if (!s.puncherAvatar)      return { ok: false, missing: '扁人者頭像' };
  if (!s.puncherJersey)      return { ok: false, missing: '扁人者服裝' };
  if (s.puncherTalks.length === 0) return { ok: false, missing: '至少 1 句嗆聲' };
  if (!s.victimName.trim())  return { ok: false, missing: '被扁者名字' };
  if (!s.victimAvatar)       return { ok: false, missing: '被扁者頭像' };
  if (!s.victimJersey)       return { ok: false, missing: '被扁者服裝' };
  return { ok: true };
}

type StartHandler = (data: SetupData) => void;

export class SetupPanel {
  private state: RawSetupState = {
    puncherName: '', puncherAvatar: null, puncherJersey: null, puncherTalks: [],
    victimName: '',  victimAvatar: null,  victimJersey: null,
  };
  private activeTab: 'puncher' | 'victim' = 'puncher';
  private handler: StartHandler = () => {};
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.render();
  }

  private render(): void {
    this.root.innerHTML = `
      <div class="setup-container">
        <div class="demo-frame">
          <div class="tabs">
            <div class="tab${this.activeTab === 'puncher' ? ' active' : ''}" data-tab="puncher">🥊 扁人</div>
            <div class="tab${this.activeTab === 'victim'  ? ' active' : ''}" data-tab="victim">😵 被扁</div>
          </div>
          <div class="tab-content"></div>
          <button class="start-btn" disabled>🥊 開打！</button>
          <div class="start-hint" style="font-size:11px;color:#ff6b6b;text-align:center;margin-top:6px"></div>
        </div>
      </div>
    `;

    this.root.querySelectorAll<HTMLElement>('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab as 'puncher' | 'victim';
        this.render();
      });
    });

    const tabContent = this.root.querySelector('.tab-content') as HTMLElement;
    this.renderActiveTab(tabContent);
    this.updateStartButton();

    const startBtn = this.root.querySelector('.start-btn') as HTMLButtonElement;
    startBtn.addEventListener('click', () => this.tryStart());
  }

  private renderActiveTab(container: HTMLElement): void {
    container.innerHTML = '<div data-slot="name"></div><div data-slot="avatar"></div><div data-slot="jersey"></div><div data-slot="talks"></div>';

    const nameRoot   = container.querySelector('[data-slot=name]')   as HTMLElement;
    const avatarRoot = container.querySelector('[data-slot=avatar]') as HTMLElement;
    const jerseyRoot = container.querySelector('[data-slot=jersey]') as HTMLElement;
    const talksRoot  = container.querySelector('[data-slot=talks]')  as HTMLElement;

    const tab = this.activeTab;
    const nameField   = new NameField(nameRoot, tab === 'puncher' ? this.state.puncherName : this.state.victimName);
    const avatarField = new AvatarUploader(avatarRoot);
    const jerseyField = new JerseyPicker(jerseyRoot);

    nameField.onChange(v => {
      if (tab === 'puncher') this.state.puncherName = v; else this.state.victimName = v;
      this.updateStartButton();
    });
    avatarField.onChange(b => {
      if (tab === 'puncher') this.state.puncherAvatar = b; else this.state.victimAvatar = b;
      this.updateStartButton();
    });
    jerseyField.onChange(j => {
      if (tab === 'puncher') this.state.puncherJersey = j; else this.state.victimJersey = j;
      this.updateStartButton();
    });

    // Initialize jersey default
    if (tab === 'puncher' && !this.state.puncherJersey) this.state.puncherJersey = jerseyField.value();
    if (tab === 'victim'  && !this.state.victimJersey)  this.state.victimJersey  = jerseyField.value();

    if (tab === 'puncher') {
      const talksField = new TrashTalkEditor(talksRoot, this.state.puncherTalks);
      talksField.onChange(t => { this.state.puncherTalks = t; this.updateStartButton(); });
    } else {
      talksRoot.innerHTML = '';
    }
  }

  private updateStartButton(): void {
    const v = validateSetupComplete(this.state);
    const btn = this.root.querySelector('.start-btn') as HTMLButtonElement;
    const hint = this.root.querySelector('.start-hint') as HTMLElement;
    btn.disabled = !v.ok;
    hint.textContent = v.ok ? '' : `請先完成：${v.missing}`;
  }

  private tryStart(): void {
    const v = validateSetupComplete(this.state);
    if (!v.ok) return;
    const data: SetupData = {
      puncher: { name: this.state.puncherName, avatar: this.state.puncherAvatar!, jersey: this.state.puncherJersey!, talks: this.state.puncherTalks },
      victim:  { name: this.state.victimName,  avatar: this.state.victimAvatar!,  jersey: this.state.victimJersey! },
      duration: 60_000,
    };
    this.handler(data);
  }

  onStart(h: StartHandler): void { this.handler = h; }
}
```

- [ ] **Step 4: Add styles**

Append to `src/styles.css`:

```css
.setup-container { max-width: 480px; margin: 0 auto; padding: 20px; }
.demo-frame { background: #1f2230; border: 2px solid #3a3f55; border-radius: 10px; padding: 14px; }
.tabs { display: flex; border-bottom: 2px solid #3a3f55; margin-bottom: 12px; }
.tab { flex: 1; padding: 10px; text-align: center; font-weight: 700; color: #888; border-bottom: 3px solid transparent; margin-bottom: -2px; cursor: pointer; }
.tab.active { color: #fff; border-bottom-color: #4a7cff; }
.start-btn { background: linear-gradient(180deg, #e74c3c, #c0392b); color: white; border: none; padding: 14px; border-radius: 8px; font-size: 16px; font-weight: 700; width: 100%; margin-top: 8px; cursor: pointer; }
.start-btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 5: Run test, confirm pass**

```bash
npm run test -- SetupPanel --run
```

Expected: PASS 4 validation tests

- [ ] **Step 6: Wire SetupPanel into main.ts**

Replace the placeholder in `src/main.ts`:

```ts
import { GameStore } from './shared/GameStore';
import { SetupPanel } from './setup/SetupPanel';
import type { SetupData } from './setup/types';

export type Screen = 'setup' | 'game' | 'replay';

export const store = new GameStore();

function showScreen(name: Screen) {
  for (const s of ['setup', 'game', 'replay'] as Screen[]) {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.hidden = s !== name;
  }
}
(window as any).showScreen = showScreen;

const setupRoot = document.getElementById('screen-setup')!;
const setup = new SetupPanel(setupRoot);
setup.onStart((data: SetupData) => {
  store.set('puncher', { ...data.puncher });
  store.set('victim', data.victim);
  showScreen('game');
  console.log('[main] start game with', data);
});

showScreen('setup');
```

- [ ] **Step 7: Manual smoke test**

```bash
npm run dev
```

Upload 2 images, type name, type 1 嗆聲 → 開打 button enables → click → game screen empty placeholder shown.

- [ ] **Step 8: Commit**

```bash
git add src/setup/SetupPanel.ts tests/unit/SetupPanel.test.ts src/main.ts src/styles.css
git commit -m "feat(setup): wire SetupPanel + validation + start handoff"
```

---

## Phase 3 — Game Foundation

### Task 15: Ring drawing

**Files:**
- Create: `src/game/Ring.ts`
- Test: `tests/unit/Ring.test.ts`

- [ ] **Step 1: Write test for ring geometry constants**

`tests/unit/Ring.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { RING_SIZE, RING_PADDING, ringBounds } from '../../src/game/Ring';

describe('Ring', () => {
  it('has 512 size', () => { expect(RING_SIZE).toBe(512); });
  it('ringBounds returns inner playable rect', () => {
    const b = ringBounds();
    expect(b.x).toBe(RING_PADDING);
    expect(b.y).toBe(RING_PADDING);
    expect(b.width).toBe(RING_SIZE - 2 * RING_PADDING);
    expect(b.height).toBe(RING_SIZE - 2 * RING_PADDING);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- Ring --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Ring**

`src/game/Ring.ts`:

```ts
export const RING_SIZE = 512;
export const RING_PADDING = 30;

export interface Rect { x: number; y: number; width: number; height: number; }

export function ringBounds(): Rect {
  return {
    x: RING_PADDING,
    y: RING_PADDING,
    width: RING_SIZE - 2 * RING_PADDING,
    height: RING_SIZE - 2 * RING_PADDING,
  };
}

export function drawRing(ctx: CanvasRenderingContext2D): void {
  // Floor
  const grad = ctx.createLinearGradient(0, 0, 0, RING_SIZE);
  grad.addColorStop(0, '#5a2020');
  grad.addColorStop(1, '#3a1010');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, RING_SIZE, RING_SIZE);

  // Outer gold frame
  ctx.strokeStyle = '#d4a017';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, RING_SIZE - 6, RING_SIZE - 6);

  // Ropes
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 3;
  for (const offset of [20, 40]) {
    ctx.beginPath(); ctx.moveTo(0, offset); ctx.lineTo(RING_SIZE, offset); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, RING_SIZE - offset); ctx.lineTo(RING_SIZE, RING_SIZE - offset); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(offset, 0); ctx.lineTo(offset, RING_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(RING_SIZE - offset, 0); ctx.lineTo(RING_SIZE - offset, RING_SIZE); ctx.stroke();
  }
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- Ring --run
```

Expected: PASS 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/game/Ring.ts tests/unit/Ring.test.ts
git commit -m "feat(game): add Ring constants + draw routine"
```

---

### Task 16: Character drawing (head/body/arms/legs/gloves)

**Files:**
- Create: `src/game/Character.ts`

- [ ] **Step 1: Implement Character renderer**

`src/game/Character.ts`:

```ts
import type { JerseyConfig } from '../setup/types';

export interface CharacterRenderInput {
  x: number;            // body center x
  y: number;            // body center y (chest)
  facing: 1 | -1;       // 1 = facing right, -1 = facing left
  armAngleL: number;    // radians; 0 = straight down
  armAngleR: number;
  avatar: ImageBitmap;
  jersey: JerseyConfig;
  name: string;
  nameColor: string;
}

const HEAD_R = 22;
const BODY_R = 25;
const ARM_LEN = 38;
const GLOVE_R = 11;
const LEG_R = 9;

export function drawCharacter(ctx: CanvasRenderingContext2D, c: CharacterRenderInput): void {
  const { x, y } = c;

  // Legs
  ctx.fillStyle = '#6a5239'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  for (const dx of [-12, 12]) {
    ctx.beginPath(); ctx.arc(x + dx, y + BODY_R + 4, LEG_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // Body (jersey)
  drawBody(ctx, x, y, BODY_R, c.jersey);

  // Arms with gloves
  drawArm(ctx, x - 12, y - 6, c.armAngleL, '#c0392b');
  drawArm(ctx, x + 12, y - 6, c.armAngleR, '#c0392b');

  // Head with avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y - BODY_R - 4, HEAD_R, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(c.avatar, x - HEAD_R, y - BODY_R - 4 - HEAD_R, HEAD_R * 2, HEAD_R * 2);
  ctx.restore();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y - BODY_R - 4, HEAD_R, 0, Math.PI * 2); ctx.stroke();

  // Name label
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  const text = c.name;
  const w = ctx.measureText(text).width + 12;
  const labelY = y - BODY_R - HEAD_R * 2 - 14;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  roundRect(ctx, x - w / 2, labelY - 12, w, 16, 8); ctx.fill();
  ctx.fillStyle = c.nameColor;
  ctx.fillText(text, x, labelY);
}

function drawBody(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, jersey: JerseyConfig): void {
  if (jersey.type === 'preset') {
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, jersey.primary);
    g.addColorStop(0.5, jersey.primary);
    g.addColorStop(0.5, jersey.secondary);
    g.addColorStop(1, jersey.secondary);
    ctx.fillStyle = g;
  } else {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(jersey.bitmap, x - r, y - r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
}

function drawArm(ctx: CanvasRenderingContext2D, shoulderX: number, shoulderY: number, angle: number, gloveColor: string): void {
  const endX = shoulderX + Math.sin(angle) * ARM_LEN;
  const endY = shoulderY + Math.cos(angle) * ARM_LEN;
  ctx.strokeStyle = '#f5d4a3'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(endX, endY); ctx.stroke();
  ctx.fillStyle = gloveColor; ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(endX, endY, GLOVE_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function gloveTipPosition(c: CharacterRenderInput, side: 'L' | 'R'): { x: number; y: number; r: number } {
  const shoulderX = c.x + (side === 'L' ? -12 : 12);
  const shoulderY = c.y - 6;
  const angle = side === 'L' ? c.armAngleL : c.armAngleR;
  return {
    x: shoulderX + Math.sin(angle) * ARM_LEN,
    y: shoulderY + Math.cos(angle) * ARM_LEN,
    r: GLOVE_R,
  };
}

export const CHARACTER_BODY_R = BODY_R;
```

- [ ] **Step 2: Commit (visual-only, no unit test for canvas drawing)**

```bash
git add src/game/Character.ts
git commit -m "feat(game): add character renderer + glove position helper"
```

---

### Task 17: GameLoop skeleton + canvas mount

**Files:**
- Create: `src/game/GameLoop.ts`
- Create: `src/game/GameScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement GameLoop**

`src/game/GameLoop.ts`:

```ts
export type UpdateFn = (deltaMs: number) => void;
export type RenderFn = (ctx: CanvasRenderingContext2D) => void;

export class GameLoop {
  private running = false;
  private last = 0;
  private rafId = 0;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private update: UpdateFn,
    private render: RenderFn,
  ) {}

  start(): void {
    this.running = true;
    this.last = performance.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const delta = now - this.last;
    this.last = now;
    this.update(delta);
    this.render(this.ctx);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
```

- [ ] **Step 2: Implement GameScene skeleton**

`src/game/GameScene.ts`:

```ts
import { drawRing, RING_SIZE } from './Ring';
import { drawCharacter } from './Character';
import { GameLoop } from './GameLoop';
import type { SetupData } from '../setup/types';

export class GameScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private loop: GameLoop;
  private data: SetupData;

  constructor(root: HTMLElement, data: SetupData) {
    this.data = data;
    root.innerHTML = `
      <div class="game-container">
        <canvas id="game-canvas" width="${RING_SIZE}" height="${RING_SIZE}"></canvas>
      </div>
    `;
    this.canvas = root.querySelector('#game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.loop = new GameLoop(this.ctx, () => this.update(), (ctx) => this.render(ctx));
  }

  start(): void { this.loop.start(); }
  stop(): void { this.loop.stop(); }

  private update(): void {
    // populated in later tasks
  }

  private render(ctx: CanvasRenderingContext2D): void {
    drawRing(ctx);
    drawCharacter(ctx, {
      x: 150, y: 350, facing: 1, armAngleL: 2.5, armAngleR: -2.5,
      avatar: this.data.puncher.avatar, jersey: this.data.puncher.jersey,
      name: this.data.puncher.name, nameColor: '#ffd700',
    });
    drawCharacter(ctx, {
      x: 360, y: 350, facing: -1, armAngleL: 2.5, armAngleR: -2.5,
      avatar: this.data.victim.avatar, jersey: this.data.victim.jersey,
      name: this.data.victim.name, nameColor: '#ff6b6b',
    });
  }
}
```

- [ ] **Step 3: Wire into main.ts**

Update `src/main.ts`:

```ts
import { GameStore } from './shared/GameStore';
import { SetupPanel } from './setup/SetupPanel';
import { GameScene } from './game/GameScene';
import type { SetupData } from './setup/types';

export type Screen = 'setup' | 'game' | 'replay';
export const store = new GameStore();

let currentGame: GameScene | null = null;

function showScreen(name: Screen) {
  for (const s of ['setup', 'game', 'replay'] as Screen[]) {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.hidden = s !== name;
  }
}
(window as any).showScreen = showScreen;

const setupRoot = document.getElementById('screen-setup')!;
const setup = new SetupPanel(setupRoot);
setup.onStart((data: SetupData) => {
  store.set('puncher', { ...data.puncher });
  store.set('victim', data.victim);
  const gameRoot = document.getElementById('screen-game')!;
  if (currentGame) currentGame.stop();
  currentGame = new GameScene(gameRoot, data);
  showScreen('game');
  currentGame.start();
});

showScreen('setup');
```

- [ ] **Step 4: Add styles**

Append to `src/styles.css`:

```css
.game-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0a0c12; }
#game-canvas { background: #000; image-rendering: pixelated; }
```

- [ ] **Step 5: Smoke test**

```bash
npm run dev
```

Fill setup → 開打 → game screen shows 512×512 ring with two static characters facing each other.

- [ ] **Step 6: Commit**

```bash
git add src/game/GameLoop.ts src/game/GameScene.ts src/main.ts src/styles.css
git commit -m "feat(game): add GameLoop + GameScene with static character render"
```

---

## Phase 4 — Game AI & Mechanics

### Task 18: Puncher state machine

**Files:**
- Create: `src/game/Puncher.ts`
- Test: `tests/unit/Puncher.test.ts`

- [ ] **Step 1: Write failing test for state transitions**

`tests/unit/Puncher.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Puncher, PUNCH_RANGE } from '../../src/game/Puncher';

describe('Puncher state machine', () => {
  it('starts in idle', () => {
    const p = new Puncher(150, 350);
    expect(p.state).toBe('idle');
  });

  it('enters wind_up when victim is in range and not on cooldown', () => {
    const p = new Puncher(150, 350);
    p.update(16, { x: 150 + PUNCH_RANGE - 1, y: 350 });
    expect(p.state).toBe('wind_up');
  });

  it('does not enter wind_up when victim is out of range', () => {
    const p = new Puncher(150, 350);
    p.update(16, { x: 150 + PUNCH_RANGE + 50, y: 350 });
    expect(p.state).toBe('idle');
  });

  it('progresses wind_up → strike → recover → idle over time', () => {
    const p = new Puncher(150, 350);
    p.update(16, { x: 150 + 50, y: 350 });
    expect(p.state).toBe('wind_up');
    p.update(150, { x: 150 + 50, y: 350 });
    expect(p.state).toBe('strike');
    p.update(120, { x: 150 + 50, y: 350 });
    expect(p.state).toBe('recover');
    p.update(250, { x: 150 + 50, y: 350 });
    expect(p.state).toBe('idle');
  });

  it('respects cooldown after recover', () => {
    const p = new Puncher(150, 350);
    p.update(16, { x: 150 + 50, y: 350 });
    p.update(150 + 120 + 250, { x: 150 + 50, y: 350 });   // through to idle
    expect(p.state).toBe('idle');
    p.update(16, { x: 150 + 50, y: 350 });                // still in cooldown
    expect(p.state).toBe('idle');
    p.update(500, { x: 150 + 50, y: 350 });               // cooldown elapsed
    expect(p.state).toBe('wind_up');
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- Puncher --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Puncher**

`src/game/Puncher.ts`:

```ts
export const PUNCH_RANGE = 110;
const WIND_UP_MS = 150;
const STRIKE_MS  = 120;
const RECOVER_MS = 250;
const COOLDOWN_MS = 500;

export type PuncherState = 'idle' | 'wind_up' | 'strike' | 'recover';

export interface Point { x: number; y: number; }

export class Puncher {
  state: PuncherState = 'idle';
  private elapsed = 0;
  private cooldown = 0;
  private strikeId = 0;
  currentStrikeId(): number { return this.strikeId; }

  constructor(public x: number, public y: number) {}

  /** call once per frame. Returns true on the first frame of strike (use for combo etc.). */
  update(deltaMs: number, victim: Point): boolean {
    let enteredStrike = false;
    if (this.state === 'idle') {
      this.cooldown = Math.max(0, this.cooldown - deltaMs);
      if (this.cooldown === 0 && distance(this, victim) <= PUNCH_RANGE) {
        this.state = 'wind_up';
        this.elapsed = 0;
      }
    } else {
      this.elapsed += deltaMs;
      if (this.state === 'wind_up' && this.elapsed >= WIND_UP_MS) {
        this.state = 'strike'; this.elapsed = 0;
        this.strikeId++;
        enteredStrike = true;
      } else if (this.state === 'strike' && this.elapsed >= STRIKE_MS) {
        this.state = 'recover'; this.elapsed = 0;
      } else if (this.state === 'recover' && this.elapsed >= RECOVER_MS) {
        this.state = 'idle'; this.elapsed = 0;
        this.cooldown = COOLDOWN_MS;
      }
    }
    return enteredStrike;
  }

  /** Returns right-arm angle for renderer (0 = down, π/2 = right). */
  rightArmAngle(): number {
    if (this.state === 'wind_up') return 1.0;        // pulled back
    if (this.state === 'strike')  return -1.6;       // forward (rightward)
    if (this.state === 'recover') return 0.5;        // returning
    return 2.5;                                       // resting (down-right)
  }
  leftArmAngle(): number { return 2.5; }
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x; const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- Puncher --run
```

Expected: PASS 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/game/Puncher.ts tests/unit/Puncher.test.ts
git commit -m "feat(game): add Puncher state machine"
```

---

### Task 19: Victim AI (noise + attraction)

**Files:**
- Create: `src/game/Victim.ts`
- Test: `tests/unit/Victim.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/Victim.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Victim } from '../../src/game/Victim';

describe('Victim', () => {
  it('drifts toward puncher over time (net attraction)', () => {
    const v = new Victim(400, 350);
    const startX = v.x;
    for (let t = 0; t < 100; t++) v.update(16, { x: 150, y: 350 });
    expect(v.x).toBeLessThan(startX);  // moved leftward toward puncher
  });

  it('stays within bounds rectangle', () => {
    const v = new Victim(400, 350);
    v.setBounds({ x: 30, y: 30, width: 452, height: 452 });
    for (let t = 0; t < 1000; t++) v.update(16, { x: 200, y: 350 });
    expect(v.x).toBeGreaterThanOrEqual(30);
    expect(v.x).toBeLessThanOrEqual(482);
    expect(v.y).toBeGreaterThanOrEqual(30);
    expect(v.y).toBeLessThanOrEqual(482);
  });

  it('takeHit pushes away from puncher', () => {
    const v = new Victim(300, 350);
    v.takeHit({ x: 200, y: 350 });
    expect(v.x).toBeGreaterThan(300);
  });

  it('increments hitsTaken on takeHit', () => {
    const v = new Victim(300, 350);
    expect(v.hitsTaken).toBe(0);
    v.takeHit({ x: 200, y: 350 });
    expect(v.hitsTaken).toBe(1);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- Victim --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Victim**

`src/game/Victim.ts`:

```ts
import type { Rect } from './Ring';

const ATTRACTION_PX_PER_FRAME = 0.25;
const NOISE_AMP = 60;
const NOISE_FREQ = 0.5;
const KNOCKBACK_PX = 30;

interface Point { x: number; y: number; }

export class Victim {
  hitsTaken = 0;
  private baseX: number;
  private baseY: number;
  private bounds: Rect | null = null;
  private timeMs = 0;
  private noiseSeedX = Math.random() * 1000;
  private noiseSeedY = Math.random() * 1000;

  constructor(public x: number, public y: number) {
    this.baseX = x; this.baseY = y;
  }

  setBounds(r: Rect): void { this.bounds = r; }

  update(deltaMs: number, puncher: Point): void {
    this.timeMs += deltaMs;

    // Attraction toward puncher
    const dx = puncher.x - this.baseX;
    const dy = puncher.y - this.baseY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.baseX += (dx / len) * ATTRACTION_PX_PER_FRAME;
    this.baseY += (dy / len) * ATTRACTION_PX_PER_FRAME;

    // Pseudo-noise jitter
    const t = this.timeMs / 1000;
    const jx = Math.sin(t * NOISE_FREQ * 2 * Math.PI + this.noiseSeedX) * NOISE_AMP;
    const jy = Math.cos(t * NOISE_FREQ * 2 * Math.PI + this.noiseSeedY) * (NOISE_AMP / 2);

    this.x = this.baseX + jx;
    this.y = this.baseY + jy;

    if (this.bounds) {
      const b = this.bounds;
      this.x = Math.min(Math.max(this.x, b.x), b.x + b.width);
      this.y = Math.min(Math.max(this.y, b.y), b.y + b.height);
      this.baseX = Math.min(Math.max(this.baseX, b.x), b.x + b.width);
      this.baseY = Math.min(Math.max(this.baseY, b.y), b.y + b.height);
    }
  }

  takeHit(puncher: Point): void {
    this.hitsTaken++;
    const dx = this.baseX - puncher.x;
    const dy = this.baseY - puncher.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.baseX += (dx / len) * KNOCKBACK_PX;
    this.baseY += (dy / len) * KNOCKBACK_PX;
  }
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- Victim --run
```

Expected: PASS 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/game/Victim.ts tests/unit/Victim.test.ts
git commit -m "feat(game): add Victim AI (attraction + noise + knockback)"
```

---

### Task 20: HitDetect (circle-circle intersection)

**Files:**
- Create: `src/game/HitDetect.ts`
- Test: `tests/unit/HitDetect.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/HitDetect.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { circlesIntersect } from '../../src/game/HitDetect';

describe('circlesIntersect', () => {
  it('returns true when overlapping', () => {
    expect(circlesIntersect({ x: 0, y: 0, r: 10 }, { x: 5, y: 0, r: 10 })).toBe(true);
  });
  it('returns false when far apart', () => {
    expect(circlesIntersect({ x: 0, y: 0, r: 5 }, { x: 100, y: 0, r: 5 })).toBe(false);
  });
  it('returns true when just touching (sum of radii = distance)', () => {
    expect(circlesIntersect({ x: 0, y: 0, r: 5 }, { x: 10, y: 0, r: 5 })).toBe(true);
  });
  it('returns false when just outside', () => {
    expect(circlesIntersect({ x: 0, y: 0, r: 5 }, { x: 10.1, y: 0, r: 5 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- HitDetect --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement HitDetect**

`src/game/HitDetect.ts`:

```ts
export interface Circle { x: number; y: number; r: number; }

export function circlesIntersect(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x; const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy) <= a.r + b.r;
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- HitDetect --run
```

Expected: PASS 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/game/HitDetect.ts tests/unit/HitDetect.test.ts
git commit -m "feat(game): add circle-circle hit detection"
```

---

### Task 21: Wire AI into GameScene

**Files:**
- Modify: `src/game/GameScene.ts`

- [ ] **Step 1: Replace GameScene with live AI**

```ts
import { drawRing, ringBounds, RING_SIZE } from './Ring';
import { drawCharacter, gloveTipPosition, CHARACTER_BODY_R } from './Character';
import { GameLoop } from './GameLoop';
import { Puncher } from './Puncher';
import { Victim } from './Victim';
import { circlesIntersect } from './HitDetect';
import type { SetupData } from '../setup/types';

export interface GameSceneCallbacks {
  onHit?: () => void;
}

export class GameScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private loop: GameLoop;
  private data: SetupData;
  private puncher: Puncher;
  private victim: Victim;
  private lastResolvedStrikeId = 0;
  private cbs: GameSceneCallbacks;

  constructor(root: HTMLElement, data: SetupData, cbs: GameSceneCallbacks = {}) {
    this.data = data;
    this.cbs = cbs;
    root.innerHTML = `<div class="game-container"><canvas id="game-canvas" width="${RING_SIZE}" height="${RING_SIZE}"></canvas></div>`;
    this.canvas = root.querySelector('#game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.puncher = new Puncher(160, 340);
    this.victim  = new Victim(360, 340);
    this.victim.setBounds(ringBounds());

    this.loop = new GameLoop(this.ctx, (d) => this.update(d), (ctx) => this.render(ctx));
  }

  start(): void { this.loop.start(); }
  stop(): void { this.loop.stop(); }

  private update(deltaMs: number): void {
    this.puncher.update(deltaMs, { x: this.victim.x, y: this.victim.y });
    this.victim.update(deltaMs, { x: this.puncher.x, y: this.puncher.y });

    if (this.puncher.state === 'strike' && this.puncher.currentStrikeId() > this.lastResolvedStrikeId) {
      const glove = gloveTipPosition(this.puncherRenderInput(), 'R');
      const victimCircle = { x: this.victim.x, y: this.victim.y, r: CHARACTER_BODY_R };
      if (circlesIntersect(glove, victimCircle)) {
        this.victim.takeHit({ x: this.puncher.x, y: this.puncher.y });
        this.cbs.onHit?.();
        this.lastResolvedStrikeId = this.puncher.currentStrikeId();
      }
    }
  }

  private render(ctx: CanvasRenderingContext2D): void {
    drawRing(ctx);
    drawCharacter(ctx, this.puncherRenderInput());
    drawCharacter(ctx, this.victimRenderInput());
  }

  private puncherRenderInput() {
    return {
      x: this.puncher.x, y: this.puncher.y, facing: 1 as const,
      armAngleL: this.puncher.leftArmAngle(),
      armAngleR: this.puncher.rightArmAngle(),
      avatar: this.data.puncher.avatar, jersey: this.data.puncher.jersey,
      name: this.data.puncher.name, nameColor: '#ffd700',
    };
  }
  private victimRenderInput() {
    return {
      x: this.victim.x, y: this.victim.y, facing: -1 as const,
      armAngleL: 2.5, armAngleR: 2.5,
      avatar: this.data.victim.avatar, jersey: this.data.victim.jersey,
      name: this.data.victim.name, nameColor: '#ff6b6b',
    };
  }
}
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```

Setup → 開打 → Victim should drift toward puncher, puncher should throw punches when close, victim should knock back on hit.

- [ ] **Step 3: Commit**

```bash
git add src/game/GameScene.ts
git commit -m "feat(game): wire Puncher + Victim + hit detection into scene"
```

---

## Phase 5 — Game Systems

### Task 22: Timer (60s countdown)

**Files:**
- Create: `src/game/Timer.ts`
- Test: `tests/unit/Timer.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/Timer.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { Timer } from '../../src/game/Timer';

describe('Timer', () => {
  it('counts down deltaMs', () => {
    const t = new Timer(1000);
    t.tick(300);
    expect(t.remainingMs).toBe(700);
  });

  it('clamps at 0', () => {
    const t = new Timer(100);
    t.tick(500);
    expect(t.remainingMs).toBe(0);
  });

  it('fires onComplete exactly once', () => {
    const done = vi.fn();
    const t = new Timer(100, done);
    t.tick(50); expect(done).not.toHaveBeenCalled();
    t.tick(50); expect(done).toHaveBeenCalledTimes(1);
    t.tick(50); expect(done).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- Timer --run
```

Expected: FAIL.

- [ ] **Step 3: Implement Timer**

`src/game/Timer.ts`:

```ts
export class Timer {
  remainingMs: number;
  private fired = false;

  constructor(durationMs: number, private onComplete: () => void = () => {}) {
    this.remainingMs = durationMs;
  }

  tick(deltaMs: number): void {
    this.remainingMs = Math.max(0, this.remainingMs - deltaMs);
    if (this.remainingMs === 0 && !this.fired) {
      this.fired = true;
      this.onComplete();
    }
  }
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- Timer --run
```

Expected: PASS 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/Timer.ts tests/unit/Timer.test.ts
git commit -m "feat(game): add countdown Timer with onComplete callback"
```

---

### Task 23: ComboTracker + milestones

**Files:**
- Create: `src/game/ComboTracker.ts`
- Test: `tests/unit/ComboTracker.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/ComboTracker.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npm run test -- ComboTracker --run
```

- [ ] **Step 3: Implement ComboTracker**

`src/game/ComboTracker.ts`:

```ts
const TIMEOUT_MS = 1500;
const MILESTONES = [5, 10, 20];

export type MilestoneHandler = (combo: number) => void;

export class ComboTracker {
  combo = 0;
  maxCombo = 0;
  private elapsedSinceLastHit = 0;
  private firedMilestones = new Set<number>();

  constructor(private onMilestone: MilestoneHandler = () => {}) {}

  hit(): void {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.elapsedSinceLastHit = 0;
    if (MILESTONES.includes(this.combo) && !this.firedMilestones.has(this.combo)) {
      this.firedMilestones.add(this.combo);
      this.onMilestone(this.combo);
    }
  }

  tick(deltaMs: number): void {
    if (this.combo === 0) return;
    this.elapsedSinceLastHit += deltaMs;
    if (this.elapsedSinceLastHit >= TIMEOUT_MS) {
      this.combo = 0;
      this.elapsedSinceLastHit = 0;
      this.firedMilestones.clear();
    }
  }
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test -- ComboTracker --run
```

Expected: PASS 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/ComboTracker.ts tests/unit/ComboTracker.test.ts
git commit -m "feat(game): add ComboTracker with timeout + milestone events"
```

---

### Task 24: DamageStateOverlay

**Files:**
- Create: `src/game/DamageStateOverlay.ts`

- [ ] **Step 1: Implement overlay renderer**

`src/game/DamageStateOverlay.ts`:

```ts
export function drawDamageOverlay(ctx: CanvasRenderingContext2D, x: number, headY: number, hits: number, timeMs: number): void {
  // Stars (≥5)
  if (hits >= 5) {
    const starAngle = (timeMs / 200) % (Math.PI * 2);
    for (let i = 0; i < 3; i++) {
      const a = starAngle + (i * Math.PI * 2 / 3);
      drawStar(ctx, x + Math.cos(a) * 22, headY - 18 + Math.sin(a) * 8, 5, '#ffeb3b');
    }
  }
  // Bumps (≥10)
  if (hits >= 10) {
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x - 10, headY - 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // Bloody nose (≥20)
  if (hits >= 20) {
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, headY - 8); ctx.lineTo(x, headY + 6); ctx.stroke();
  }
  // Sweat / dishevelment (≥30)
  if (hits >= 30) {
    ctx.fillStyle = '#5dade2';
    ctx.beginPath(); ctx.arc(x + 18, headY - 15, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 18, headY + 4, 2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    const ai = a + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(ai) * r / 2, cy + Math.sin(ai) * r / 2);
  }
  ctx.closePath();
  ctx.fill();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/DamageStateOverlay.ts
git commit -m "feat(game): add escalating damage overlay (stars/bumps/blood)"
```

---

### Task 25: SpeechBubble + TTS integration

**Files:**
- Create: `src/game/SpeechBubble.ts`

- [ ] **Step 1: Implement SpeechBubble**

`src/game/SpeechBubble.ts`:

```ts
import { TTS } from '../shared/TTS';

const SHOW_MS = 1000;
const TRIGGER_PROBABILITY = 0.3;

interface ActiveBubble {
  text: string;
  x: number;
  y: number;
  remainingMs: number;
}

export class SpeechBubbleSystem {
  private active: ActiveBubble | null = null;
  private cursor = 0;

  constructor(private talks: string[]) {}

  maybeTrigger(puncher: { x: number; y: number }): void {
    if (this.talks.length === 0) return;
    if (Math.random() >= TRIGGER_PROBABILITY) return;
    const text = this.talks[this.cursor % this.talks.length];
    this.cursor++;
    this.active = { text, x: puncher.x, y: puncher.y - 80, remainingMs: SHOW_MS };
    TTS.speak(text);
  }

  /** Force-trigger ignoring probability — used by tests / debug. */
  forceTrigger(puncher: { x: number; y: number }): void {
    if (this.talks.length === 0) return;
    const text = this.talks[this.cursor % this.talks.length];
    this.cursor++;
    this.active = { text, x: puncher.x, y: puncher.y - 80, remainingMs: SHOW_MS };
    TTS.speak(text);
  }

  tick(deltaMs: number): void {
    if (this.active) {
      this.active.remainingMs -= deltaMs;
      if (this.active.remainingMs <= 0) this.active = null;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const { text, x, y, remainingMs } = this.active;
    const alpha = Math.min(1, remainingMs / 300);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 13px sans-serif';
    const w = ctx.measureText(text).width + 20;
    const h = 24;
    ctx.fillStyle = '#fff';
    roundRect(ctx, x - w / 2, y - h, w, h, 12); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.stroke();
    // tail
    ctx.beginPath();
    ctx.moveTo(x - 8, y); ctx.lineTo(x, y + 8); ctx.lineTo(x + 8, y);
    ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - h / 2);
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/SpeechBubble.ts
git commit -m "feat(game): add speech bubble system with TTS sync"
```

---

### Task 26: HUD (timer + hits/combo)

**Files:**
- Create: `src/game/HUD.ts`

- [ ] **Step 1: Implement HUD as HTML overlay**

`src/game/HUD.ts`:

```ts
export class HUD {
  private root: HTMLElement;
  private timeEl: HTMLElement;
  private hitsEl: HTMLElement;
  private comboEl: HTMLElement;

  constructor(container: HTMLElement) {
    container.insertAdjacentHTML('beforeend', `
      <div class="hud">
        <div class="hud-time"><span class="lbl">Time</span> <span class="val">60</span></div>
        <div class="hud-right">
          <div><span class="lbl">Hits</span> <span class="val hud-hits">0</span></div>
          <div><span class="lbl">Combo</span> <span class="val hud-combo">x0</span></div>
        </div>
      </div>
    `);
    this.root = container.querySelector('.hud')!;
    this.timeEl  = this.root.querySelector('.hud-time .val')!;
    this.hitsEl  = this.root.querySelector('.hud-hits')!;
    this.comboEl = this.root.querySelector('.hud-combo')!;
  }

  update(remainingMs: number, hits: number, combo: number): void {
    this.timeEl.textContent  = String(Math.ceil(remainingMs / 1000));
    this.hitsEl.textContent  = String(hits);
    this.comboEl.textContent = `x${combo}`;
  }

  destroy(): void { this.root.remove(); }
}
```

- [ ] **Step 2: Add styles**

Append to `src/styles.css`:

```css
.game-container { position: relative; }
.hud { position: absolute; top: 14px; left: 14px; right: 14px; color: #fff; display: flex; justify-content: space-between; pointer-events: none; text-shadow: 0 1px 2px #000; font-weight: 700; font-size: 14px; }
.hud .lbl { font-size: 10px; opacity: 0.7; text-transform: uppercase; margin-right: 4px; }
.hud-right { display: flex; gap: 16px; text-align: right; }
```

- [ ] **Step 3: Commit**

```bash
git add src/game/HUD.ts src/styles.css
git commit -m "feat(game): add HUD overlay for time/hits/combo"
```

---

### Task 27: Recorder (MediaRecorder)

**Files:**
- Create: `src/game/Recorder.ts`

- [ ] **Step 1: Implement Recorder**

`src/game/Recorder.ts`:

```ts
export class Recorder {
  static isSupported(): boolean {
    return typeof MediaRecorder !== 'undefined'
        && MediaRecorder.isTypeSupported('video/webm');
  }

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  constructor(private canvas: HTMLCanvasElement) {}

  start(): void {
    if (!Recorder.isSupported()) return;
    const stream = this.canvas.captureStream(30);
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.mediaRecorder.start(500);
  }

  async stop(): Promise<Blob | null> {
    if (!this.mediaRecorder) return null;
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        resolve(new Blob(this.chunks, { type: 'video/webm' }));
      };
      this.mediaRecorder!.stop();
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/Recorder.ts
git commit -m "feat(game): add MediaRecorder wrapper for canvas capture"
```

---

### Task 28: Integrate all game systems into GameScene

**Files:**
- Modify: `src/game/GameScene.ts`

- [ ] **Step 1: Rewrite GameScene with full integration**

```ts
import { drawRing, ringBounds, RING_SIZE } from './Ring';
import { drawCharacter, gloveTipPosition, CHARACTER_BODY_R } from './Character';
import { drawDamageOverlay } from './DamageStateOverlay';
import { GameLoop } from './GameLoop';
import { Puncher } from './Puncher';
import { Victim } from './Victim';
import { circlesIntersect } from './HitDetect';
import { ComboTracker } from './ComboTracker';
import { Timer } from './Timer';
import { SpeechBubbleSystem } from './SpeechBubble';
import { HUD } from './HUD';
import { Recorder } from './Recorder';
import { audio } from '../shared/Audio';
import type { SetupData } from '../setup/types';

export interface GameStats {
  totalHits: number;
  maxCombo: number;
  damageLevel: number;
  hitTimestamps: number[];
}

export class GameScene {
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private ctx: CanvasRenderingContext2D;
  private loop: GameLoop;
  private data: SetupData;
  private puncher: Puncher;
  private victim: Victim;
  private lastResolvedStrikeId = 0;
  private timeMs = 0;
  private combo: ComboTracker;
  private timer: Timer;
  private speech: SpeechBubbleSystem;
  private hud: HUD;
  private recorder: Recorder;
  private hitTimestamps: number[] = [];
  private onFinish: (stats: GameStats, blob: Blob | null) => void;

  constructor(root: HTMLElement, data: SetupData, onFinish: (stats: GameStats, blob: Blob | null) => void) {
    this.data = data;
    this.onFinish = onFinish;
    root.innerHTML = `<div class="game-container"><canvas id="game-canvas" width="${RING_SIZE}" height="${RING_SIZE}"></canvas></div>`;
    this.container = root.querySelector('.game-container') as HTMLElement;
    this.canvas = root.querySelector('#game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.puncher = new Puncher(160, 340);
    this.victim  = new Victim(360, 340);
    this.victim.setBounds(ringBounds());

    this.combo = new ComboTracker((m) => this.shake(m));
    this.timer = new Timer(data.duration, () => this.finish());
    this.speech = new SpeechBubbleSystem(data.puncher.talks);
    this.hud = new HUD(this.container);
    this.recorder = new Recorder(this.canvas);

    this.loop = new GameLoop(this.ctx, (d) => this.update(d), (ctx) => this.render(ctx));

    audio.preload();
  }

  start(): void {
    audio.play('bgm');
    this.recorder.start();
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
    audio.stop('bgm');
    this.hud.destroy();
  }

  private async finish(): Promise<void> {
    this.loop.stop();
    audio.stop('bgm');
    const blob = await this.recorder.stop();
    const stats: GameStats = {
      totalHits: this.victim.hitsTaken,
      maxCombo: this.combo.maxCombo,
      damageLevel: this.computeDamageLevel(),
      hitTimestamps: [...this.hitTimestamps],
    };
    this.hud.destroy();
    this.onFinish(stats, blob);
  }

  private computeDamageLevel(): number {
    const h = this.victim.hitsTaken;
    if (h >= 30) return 4;
    if (h >= 20) return 3;
    if (h >= 10) return 2;
    if (h >=  5) return 1;
    return 0;
  }

  private update(deltaMs: number): void {
    this.timeMs += deltaMs;
    this.timer.tick(deltaMs);
    this.puncher.update(deltaMs, { x: this.victim.x, y: this.victim.y });
    this.victim.update(deltaMs, { x: this.puncher.x, y: this.puncher.y });
    this.combo.tick(deltaMs);
    this.speech.tick(deltaMs);

    if (this.puncher.state === 'strike' && this.puncher.currentStrikeId() > this.lastResolvedStrikeId) {
      const glove = gloveTipPosition(this.puncherRender(), 'R');
      const victimCircle = { x: this.victim.x, y: this.victim.y, r: CHARACTER_BODY_R };
      if (circlesIntersect(glove, victimCircle)) {
        this.victim.takeHit({ x: this.puncher.x, y: this.puncher.y });
        this.combo.hit();
        this.hitTimestamps.push(this.timeMs);
        this.speech.maybeTrigger({ x: this.puncher.x, y: this.puncher.y });
        audio.play('hit');
        this.lastResolvedStrikeId = this.puncher.currentStrikeId();
      }
    }

    this.hud.update(this.timer.remainingMs, this.victim.hitsTaken, this.combo.combo);
  }

  private render(ctx: CanvasRenderingContext2D): void {
    drawRing(ctx);
    drawCharacter(ctx, this.puncherRender());
    drawCharacter(ctx, this.victimRender());
    drawDamageOverlay(ctx, this.victim.x, this.victim.y - 50, this.victim.hitsTaken, this.timeMs);
    this.speech.draw(ctx);
  }

  private puncherRender() {
    return {
      x: this.puncher.x, y: this.puncher.y, facing: 1 as const,
      armAngleL: this.puncher.leftArmAngle(),
      armAngleR: this.puncher.rightArmAngle(),
      avatar: this.data.puncher.avatar, jersey: this.data.puncher.jersey,
      name: this.data.puncher.name, nameColor: '#ffd700',
    };
  }
  private victimRender() {
    return {
      x: this.victim.x, y: this.victim.y, facing: -1 as const,
      armAngleL: 2.5, armAngleR: 2.5,
      avatar: this.data.victim.avatar, jersey: this.data.victim.jersey,
      name: this.data.victim.name, nameColor: '#ff6b6b',
    };
  }

  private shake(_combo: number): void {
    this.container.classList.add('shake');
    setTimeout(() => this.container.classList.remove('shake'), 300);
  }
}
```

- [ ] **Step 2: Add shake CSS**

Append to `src/styles.css`:

```css
@keyframes shake {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(-6px, 4px); }
  40% { transform: translate(8px, -3px); }
  60% { transform: translate(-5px, -5px); }
  80% { transform: translate(4px, 6px); }
}
.shake { animation: shake 0.3s ease-in-out; }
```

- [ ] **Step 3: Update main.ts to use new GameScene signature**

Update `src/main.ts`:

```ts
import { GameStore } from './shared/GameStore';
import { SetupPanel } from './setup/SetupPanel';
import { GameScene, type GameStats } from './game/GameScene';
import type { SetupData } from './setup/types';

export type Screen = 'setup' | 'game' | 'replay';
export const store = new GameStore();

let currentGame: GameScene | null = null;
let lastSetupData: SetupData | null = null;

function showScreen(name: Screen) {
  for (const s of ['setup', 'game', 'replay'] as Screen[]) {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.hidden = s !== name;
  }
}
(window as any).showScreen = showScreen;

function startGame(data: SetupData) {
  lastSetupData = data;
  const gameRoot = document.getElementById('screen-game')!;
  if (currentGame) currentGame.stop();
  currentGame = new GameScene(gameRoot, data, (stats: GameStats, blob) => {
    store.set('stats', {
      totalHits: stats.totalHits,
      maxCombo: stats.maxCombo,
      hotZoneStart: computeHotZone(stats.hitTimestamps),
      damageLevel: stats.damageLevel,
    });
    store.set('recording', blob);
    showScreen('replay');
  });
  showScreen('game');
  currentGame.start();
}

function computeHotZone(hits: number[]): number {
  if (hits.length === 0) return 0;
  const windowMs = 10_000;
  let best = 0; let bestStart = 0;
  for (const h of hits) {
    const count = hits.filter(t => t >= h && t < h + windowMs).length;
    if (count > best) { best = count; bestStart = h; }
  }
  return bestStart;
}

const setupRoot = document.getElementById('screen-setup')!;
const setup = new SetupPanel(setupRoot);
setup.onStart(startGame);

(window as any).restartLast = () => { if (lastSetupData) startGame(lastSetupData); };

showScreen('setup');
```

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

Setup → 開打 → see HUD counting down, victim taking hits, damage overlay appearing after 5 hits, combo triggering screen shake. After 60s → switches to (empty) replay screen.

- [ ] **Step 5: Commit**

```bash
git add src/game/GameScene.ts src/main.ts src/styles.css
git commit -m "feat(game): integrate all systems (combo/timer/speech/hud/recorder)"
```

---

## Phase 6 — Replay Screen

### Task 29: ReplayPlayer + StatsPanel + ActionBar

**Files:**
- Create: `src/replay/ReplayPlayer.ts`
- Create: `src/replay/StatsPanel.ts`
- Create: `src/replay/ActionBar.ts`
- Create: `src/replay/ReplayScreen.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement ReplayPlayer**

`src/replay/ReplayPlayer.ts`:

```ts
export class ReplayPlayer {
  private url: string | null = null;
  constructor(private root: HTMLElement) {}

  render(blob: Blob | null): void {
    if (!blob) {
      this.root.innerHTML = `<div class="empty-replay">你的瀏覽器不支援錄影，所以沒有重播檔。</div>`;
      return;
    }
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(blob);
    this.root.innerHTML = `
      <video src="${this.url}" controls autoplay class="replay-video"></video>
      <div class="replay-actions">
        <a class="replay-download" href="${this.url}" download="fight.webm">⬇ 下載 .webm</a>
      </div>
    `;
  }

  destroy(): void {
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
  }
}
```

- [ ] **Step 2: Implement StatsPanel**

`src/replay/StatsPanel.ts`:

```ts
import type { GameStats } from '../shared/GameStore';

const LEVEL_LABELS = ['毫髮無傷', '皮肉傷', '滿臉腫包', '鼻血直流', '蓬頭垢面'];

export class StatsPanel {
  constructor(private root: HTMLElement) {}

  render(stats: GameStats | null): void {
    if (!stats) { this.root.innerHTML = ''; return; }
    const hotZoneStart = Math.floor(stats.hotZoneStart / 1000);
    this.root.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">總命中</div><div class="stat-value">${stats.totalHits}</div></div>
        <div class="stat-card"><div class="stat-label">最高連擊</div><div class="stat-value">x${stats.maxCombo}</div></div>
        <div class="stat-card"><div class="stat-label">最狠 10 秒</div><div class="stat-value">${hotZoneStart}s 起</div></div>
        <div class="stat-card"><div class="stat-label">狼狽指數</div><div class="stat-value">${LEVEL_LABELS[stats.damageLevel] ?? '—'}</div></div>
      </div>
    `;
  }
}
```

- [ ] **Step 3: Implement ActionBar**

`src/replay/ActionBar.ts`:

```ts
export interface ActionHandlers {
  onNew: () => void;
  onRematch: () => void;
}

export class ActionBar {
  constructor(private root: HTMLElement) {}

  render(handlers: ActionHandlers): void {
    this.root.innerHTML = `
      <div class="action-row">
        <button class="action-new">🆕 再戰一場</button>
        <button class="action-rematch">↻ 重打上一位</button>
      </div>
    `;
    (this.root.querySelector('.action-new') as HTMLElement).addEventListener('click', handlers.onNew);
    (this.root.querySelector('.action-rematch') as HTMLElement).addEventListener('click', handlers.onRematch);
  }
}
```

- [ ] **Step 4: Implement ReplayScreen wiring all three**

`src/replay/ReplayScreen.ts`:

```ts
import { ReplayPlayer } from './ReplayPlayer';
import { StatsPanel } from './StatsPanel';
import { ActionBar, type ActionHandlers } from './ActionBar';
import type { GameStats } from '../shared/GameStore';

export class ReplayScreen {
  private player: ReplayPlayer;
  private stats: StatsPanel;
  private actions: ActionBar;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="replay-container">
        <h2 class="replay-title">🎬 精華重播</h2>
        <div class="replay-video-slot"></div>
        <div class="replay-stats-slot"></div>
        <div class="replay-actions-slot"></div>
      </div>
    `;
    this.player  = new ReplayPlayer(root.querySelector('.replay-video-slot')!);
    this.stats   = new StatsPanel(root.querySelector('.replay-stats-slot')!);
    this.actions = new ActionBar(root.querySelector('.replay-actions-slot')!);
  }

  render(stats: GameStats | null, recording: Blob | null, handlers: ActionHandlers): void {
    this.player.render(recording);
    this.stats.render(stats);
    this.actions.render(handlers);
  }

  destroy(): void { this.player.destroy(); }
}
```

- [ ] **Step 5: Wire into main.ts**

Update `src/main.ts` to instantiate ReplayScreen on game finish:

```ts
import { GameStore } from './shared/GameStore';
import { SetupPanel } from './setup/SetupPanel';
import { GameScene, type GameStats as RawStats } from './game/GameScene';
import { ReplayScreen } from './replay/ReplayScreen';
import type { SetupData } from './setup/types';

export type Screen = 'setup' | 'game' | 'replay';
export const store = new GameStore();

let currentGame: GameScene | null = null;
let lastSetupData: SetupData | null = null;
let replayScreen: ReplayScreen | null = null;

function showScreen(name: Screen) {
  for (const s of ['setup', 'game', 'replay'] as Screen[]) {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.hidden = s !== name;
  }
}

function computeHotZone(hits: number[]): number {
  if (hits.length === 0) return 0;
  const windowMs = 10_000;
  let best = 0; let bestStart = 0;
  for (const h of hits) {
    const count = hits.filter(t => t >= h && t < h + windowMs).length;
    if (count > best) { best = count; bestStart = h; }
  }
  return bestStart;
}

function showReplay() {
  const replayRoot = document.getElementById('screen-replay')!;
  if (!replayScreen) replayScreen = new ReplayScreen(replayRoot);
  replayScreen.render(store.get('stats'), store.get('recording'), {
    onNew: () => {
      store.set('puncher', null);
      store.set('victim', null);
      store.set('recording', null);
      lastSetupData = null;
      location.reload();   // simplest reset
    },
    onRematch: () => { if (lastSetupData) startGame(lastSetupData); },
  });
  showScreen('replay');
}

function startGame(data: SetupData) {
  lastSetupData = data;
  const gameRoot = document.getElementById('screen-game')!;
  if (currentGame) currentGame.stop();
  currentGame = new GameScene(gameRoot, data, (stats: RawStats, blob) => {
    store.set('stats', {
      totalHits: stats.totalHits,
      maxCombo: stats.maxCombo,
      hotZoneStart: computeHotZone(stats.hitTimestamps),
      damageLevel: stats.damageLevel,
    });
    store.set('recording', blob);
    showReplay();
  });
  showScreen('game');
  currentGame.start();
}

const setupRoot = document.getElementById('screen-setup')!;
const setup = new SetupPanel(setupRoot);
setup.onStart(startGame);

showScreen('setup');
```

- [ ] **Step 6: Add styles**

Append to `src/styles.css`:

```css
.replay-container { max-width: 600px; margin: 0 auto; padding: 20px; }
.replay-title { color: #ffd700; text-align: center; }
.replay-video { width: 100%; max-width: 512px; display: block; margin: 0 auto; background: #000; }
.replay-actions { text-align: center; margin-top: 10px; }
.replay-download { display: inline-block; background: #4a7cff; color: #fff; padding: 8px 18px; border-radius: 6px; text-decoration: none; font-weight: 700; }
.empty-replay { background: #2a2e42; color: #ccc; padding: 30px; text-align: center; border-radius: 8px; }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 16px; }
.stat-card { background: #2a2e42; padding: 12px; border-radius: 8px; text-align: center; }
.stat-label { font-size: 11px; color: #aaa; text-transform: uppercase; }
.stat-value { font-size: 22px; font-weight: 700; color: #ffd700; margin-top: 4px; }
.action-row { display: flex; gap: 10px; margin-top: 16px; }
.action-new, .action-rematch { flex: 1; background: #4a7cff; color: #fff; border: none; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
.action-rematch { background: #c0392b; }
```

- [ ] **Step 7: Smoke test**

```bash
npm run dev
```

Full path: Setup → 開打 → 60s → Replay shows stats grid + video + 2 buttons. Click 「重打上一位」 → game restarts with same setup. Click 「再戰一場」 → reload to fresh setup.

- [ ] **Step 8: Commit**

```bash
git add src/replay/ src/main.ts src/styles.css
git commit -m "feat(replay): add Replay screen with video, stats, and action bar"
```

---

## Phase 7 — Polish

### Task 30: localStorage auto-save / load for setup

**Files:**
- Modify: `src/setup/SetupPanel.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Add hydration helper**

Append to `src/setup/SetupPanel.ts`:

```ts
import { saveSetup, loadSetup, type PersistedSetup, type PersistedJersey } from '../shared/Persistence';

// inside SetupPanel class:
async hydrateFromLocalStorage(): Promise<void> {
  const saved = loadSetup();
  if (!saved) return;
  this.state.puncherName = saved.puncher.name;
  this.state.victimName  = saved.victim.name;
  this.state.puncherTalks = saved.puncher.talks ?? [];
  if (saved.puncher.avatarDataUrl) this.state.puncherAvatar = await dataUrlToBitmap(saved.puncher.avatarDataUrl);
  if (saved.victim.avatarDataUrl)  this.state.victimAvatar  = await dataUrlToBitmap(saved.victim.avatarDataUrl);
  this.state.puncherJersey = await rehydrateJersey(saved.puncher.jersey);
  this.state.victimJersey  = await rehydrateJersey(saved.victim.jersey);
  this.render();
}

persistCurrentState(): void {
  if (!this.state.puncherAvatar || !this.state.victimAvatar) return;
  const persisted: PersistedSetup = {
    puncher: {
      name: this.state.puncherName,
      avatarDataUrl: bitmapToDataUrl(this.state.puncherAvatar),
      jersey: jerseyToPersisted(this.state.puncherJersey!),
      talks: this.state.puncherTalks,
    },
    victim: {
      name: this.state.victimName,
      avatarDataUrl: bitmapToDataUrl(this.state.victimAvatar),
      jersey: jerseyToPersisted(this.state.victimJersey!),
    },
  };
  saveSetup(persisted);
}

// helpers at bottom of file:
function bitmapToDataUrl(b: ImageBitmap): string {
  const c = document.createElement('canvas');
  c.width = b.width; c.height = b.height;
  c.getContext('2d')!.drawImage(b, 0, 0);
  return c.toDataURL('image/png');
}
async function dataUrlToBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  const blob = await res.blob();
  return createImageBitmap(blob);
}
function jerseyToPersisted(j: JerseyConfig): PersistedJersey {
  if (j.type === 'preset') return { type: 'preset', primary: j.primary, secondary: j.secondary };
  return { type: 'custom', primary: '#000', secondary: '#fff', bitmapDataUrl: bitmapToDataUrl(j.bitmap) };
}
async function rehydrateJersey(p: PersistedJersey): Promise<JerseyConfig> {
  if (p.type === 'preset') return { type: 'preset', primary: p.primary, secondary: p.secondary };
  return { type: 'custom', bitmap: await dataUrlToBitmap(p.bitmapDataUrl!) };
}
```

- [ ] **Step 2: Persist on each change**

In `SetupPanel.updateStartButton()`, after computing `v`:

```ts
if (v.ok) this.persistCurrentState();
```

- [ ] **Step 3: Call hydrate on app boot**

In `src/main.ts`, after `setup.onStart(startGame);`:

```ts
setup.hydrateFromLocalStorage();
```

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

Fill out setup, refresh page → fields prefilled.

- [ ] **Step 5: Commit**

```bash
git add src/setup/SetupPanel.ts src/main.ts
git commit -m "feat(setup): auto-save + hydrate setup data from localStorage"
```

---

### Task 31: Compatibility banner

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add detection + banner**

At the top of `src/main.ts`:

```ts
import { TTS } from './shared/TTS';
import { Recorder } from './game/Recorder';

function showCompatBannerIfNeeded() {
  const banner = document.getElementById('compat-banner');
  if (!banner) return;
  const recOK = Recorder.isSupported();
  const ttsOK = TTS.isAvailable();
  if (recOK && ttsOK) return;
  const missing: string[] = [];
  if (!recOK) missing.push('錄影');
  if (!ttsOK) missing.push('語音');
  banner.textContent = `⚠ 部分功能（${missing.join('、')}）在你的瀏覽器可能失效，建議用桌機 Chrome/Edge 體驗完整版。`;
  banner.hidden = false;
}
showCompatBannerIfNeeded();
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```

On a supported browser the banner stays hidden. To verify it can show, in DevTools console: `delete window.SpeechSynthesisUtterance; location.reload();`.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: detect MediaRecorder/Web Speech and show compat banner"
```

---

## Phase 8 — Tests & Build

### Task 32: E2E happy path with Playwright

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/happy-path.spec.ts`
- Create: `tests/e2e/fixtures/test-avatar.png` (any small PNG)

- [ ] **Step 1: Install Playwright browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 2: Create playwright.config.ts**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

- [ ] **Step 3: Add a tiny test fixture PNG**

Generate via Node (run once):

```bash
node -e "const fs=require('fs');const buf=Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108020000007E5D6F340000000C49444154789C6360D8AB4D03002BC50100B7570E150000000049454E44AE426082','hex');fs.writeFileSync('tests/e2e/fixtures/test-avatar.png',buf);"
```

- [ ] **Step 4: Write E2E test**

`tests/e2e/happy-path.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR = path.join(__dirname, 'fixtures', 'test-avatar.png');

test('full happy path: setup → game → replay', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.locator('#screen-setup')).toBeVisible();

  // Puncher tab (active by default)
  await page.locator('#screen-setup input[type=text]').first().fill('小明');
  await page.locator('#screen-setup input[type=file]').nth(0).setInputFiles(AVATAR);
  await page.locator('input.talk').first().fill('雷包');

  // Switch to victim tab
  await page.locator('.tab[data-tab=victim]').click();
  await page.locator('#screen-setup input[type=text]').first().fill('阿德');
  await page.locator('#screen-setup input[type=file]').nth(0).setInputFiles(AVATAR);

  // Switch back to puncher to verify start button is enabled
  await page.locator('.tab[data-tab=puncher]').click();
  const startBtn = page.locator('.start-btn');
  await expect(startBtn).toBeEnabled({ timeout: 5000 });

  await startBtn.click();
  await expect(page.locator('#screen-game')).toBeVisible();
  await expect(page.locator('#game-canvas')).toBeVisible();

  // Fast-forward: shorten timer for E2E (not implemented here; just wait the full duration)
  // For CI we'd lower duration via query param. v1 just waits.
  await expect(page.locator('#screen-replay')).toBeVisible({ timeout: 70_000 });
  await expect(page.locator('.stats-grid')).toBeVisible();
});
```

> **Note for implementer:** running this test once-end-to-end takes ~70s. To speed up, add a `?duration=5000` URL param parser in `main.ts` that overrides `data.duration` (left as a small optional improvement).

- [ ] **Step 5: Run E2E**

```bash
npm run test:e2e
```

Expected: 1 test passes (with `?duration=5000` shortcut, much faster).

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/e2e/
git commit -m "test(e2e): add happy path Playwright spec"
```

---

### Task 33: Production build + deployment readiness

**Files:**
- Modify: `vite.config.ts`
- Create: `README.md`

- [ ] **Step 1: Verify build succeeds**

```bash
npm run build
```

Expected: `dist/` directory created with `index.html`, hashed JS, CSS, audio files.

- [ ] **Step 2: Verify preview**

```bash
npm run preview
```

Open the printed URL — full game works.

- [ ] **Step 3: Create README.md**

```markdown
# 嘴砲擂台 — Boxing Rant Game

A 60-second browser game: customize two cartoon boxers (or a "boxer + victim"), pick jerseys, type trash-talk, and watch the puncher beat the victim while shouting your insults. Records the fight and lets you download the .webm.

## Run locally
```
npm install
npm run dev
```

Open http://localhost:5173.

## Build
```
npm run build
npm run preview
```

The `dist/` folder is static and can be deployed to GitHub Pages, Netlify, or any static host.

## Tests
```
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E
```

## Disclaimer
Names entered in this game are purely fictional. Any resemblance to real persons is coincidental and intended as satire/play.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup/run/build/deploy instructions"
```

---

## Self-Review Notes

Spec coverage verified:
- § 2 Scope (In/Out): all in-scope items implemented
- § 3 Tech stack: all selected
- § 4 Directory: matches plan
- § 5 Three screens: routed via `showScreen`
- § 6 Setup components: NameField/AvatarUploader/JerseyPicker/TrashTalkEditor/SetupPanel ✓
- § 7 CartoonFilter pipeline: 5 steps in Task 7-8
- § 8 Game systems: Puncher/Victim/HitDetect/Combo/Damage/Speech/Recorder/HUD/Timer ✓
- § 9 Replay: Player/Stats/ActionBar ✓
- § 10 GameStore + localStorage: Tasks 3, 4, 30
- § 11 Error handling: validation in AvatarUploader, fallbacks in CartoonFilter/Recorder/TTS, banner in Task 31
- § 12 Tests: Vitest unit (each task), Playwright E2E (Task 32)
- § 13 Deploy: Task 33
- § 14 Decided items: 6 jerseys (Task 12), placeholder audio (Task 6), iOS banner (Task 31), fixed filter strength (Task 7-8)
