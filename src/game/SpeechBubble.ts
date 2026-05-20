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
