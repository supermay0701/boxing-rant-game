import type { Rect } from './Ring';

const ATTRACTION_PX_PER_FRAME = 0.25;
const NOISE_AMP = 60;
const NOISE_FREQ = 0.5;
const KNOCKBACK_PX = 30;
const KO_DURATION_MS = 600;
const HITS_PER_KO = 8;

interface Point { x: number; y: number; }

export class Victim {
  hitsTaken = 0;
  isKnockedDown = false;
  armsBroken = false;
  private koRemainingMs = 0;
  private hitsSinceLastKO = 0;
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

    if (this.isKnockedDown) {
      this.koRemainingMs -= deltaMs;
      if (this.koRemainingMs <= 0) {
        this.isKnockedDown = false;
      }
      return;  // don't move, don't attract while KO'd
    }

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
    this.hitsSinceLastKO++;
    const dx = this.baseX - puncher.x;
    const dy = this.baseY - puncher.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.baseX += (dx / len) * KNOCKBACK_PX;
    this.baseY += (dy / len) * KNOCKBACK_PX;
    // Sync rendered position immediately so callers see the knockback
    this.x = this.baseX;
    this.y = this.baseY;

    if (this.hitsSinceLastKO >= HITS_PER_KO) {
      this.isKnockedDown = true;
      this.koRemainingMs = KO_DURATION_MS;
      this.hitsSinceLastKO = 0;
      this.armsBroken = true;  // persists after recovery
    }
  }
}
