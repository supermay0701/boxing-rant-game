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
