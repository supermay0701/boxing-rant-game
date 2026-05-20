import { GameStore } from './shared/GameStore';
import { SetupPanel } from './setup/SetupPanel';
import { GameScene, type GameStats as RawStats } from './game/GameScene';
import { ReplayScreen } from './replay/ReplayScreen';
import type { SetupData } from './setup/types';
import { TTS } from './shared/TTS';
import { Recorder } from './game/Recorder';

export type Screen = 'setup' | 'game' | 'replay';
export const store = new GameStore();

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
setup.hydrateFromLocalStorage();

showScreen('setup');
