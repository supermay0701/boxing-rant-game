export class HUD {
  private root: HTMLElement;
  private timeEl: HTMLElement;
  private hitsEl: HTMLElement;
  private comboEl: HTMLElement;

  constructor(container: HTMLElement) {
    container.insertAdjacentHTML('beforeend', `
      <div class="hud">
        <div class="hud-time"><span class="lbl">TIME</span> <span class="val">60</span></div>
        <div class="hud-stats">
          <span><span class="lbl">HITS</span> <span class="val hud-hits">0</span></span>
          <span><span class="lbl">COMBO</span> <span class="val hud-combo">x0</span></span>
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
