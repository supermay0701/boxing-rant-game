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
