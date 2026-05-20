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
