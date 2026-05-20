import { GameStore } from './shared/GameStore';
import { SetupPanel } from './setup/SetupPanel';
import { GameScene, type GameStats as RawStats } from './game/GameScene';
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
  currentGame = new GameScene(gameRoot, data, (stats: RawStats, blob) => {
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
