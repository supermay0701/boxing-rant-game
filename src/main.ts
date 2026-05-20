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
