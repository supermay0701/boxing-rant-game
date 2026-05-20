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
