import { drawRing, ringBounds, RING_SIZE } from './Ring';
import { drawCharacter, gloveTipPosition, CHARACTER_BODY_R } from './Character';
import { drawDamageOverlay } from './DamageStateOverlay';
import { GameLoop } from './GameLoop';
import { Puncher } from './Puncher';
import { Victim } from './Victim';
import { circlesIntersect } from './HitDetect';
import { ComboTracker } from './ComboTracker';
import { Timer } from './Timer';
import { SpeechBubbleSystem } from './SpeechBubble';
import { HUD } from './HUD';
import { Recorder } from './Recorder';
import { audio } from '../shared/Audio';
import type { SetupData } from '../setup/types';

export interface GameStats {
  totalHits: number;
  maxCombo: number;
  damageLevel: number;
  hitTimestamps: number[];
}

export class GameScene {
  private static RAGE_BUTTON_HITS = 5;

  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private ctx: CanvasRenderingContext2D;
  private loop: GameLoop;
  private data: SetupData;
  private puncher: Puncher;
  private victim: Victim;
  private lastResolvedStrikeId = 0;
  private timeMs = 0;
  private ended = false;
  private combo: ComboTracker;
  private timer: Timer;
  private speech: SpeechBubbleSystem;
  private hud: HUD;
  private recorder: Recorder;
  private hitTimestamps: number[] = [];
  private floatingTexts: { text: string; x: number; y: number; remainingMs: number; color: string; size: number }[] = [];
  private wasVictimKO = false;
  private rageTriggered = false;
  private onFinish: (stats: GameStats, blob: Blob | null, mimeType: string | null) => void;

  constructor(root: HTMLElement, data: SetupData, onFinish: (stats: GameStats, blob: Blob | null, mimeType: string | null) => void) {
    this.data = data;
    this.onFinish = onFinish;
    root.innerHTML = `<div class="game-container"><canvas id="game-canvas" width="${RING_SIZE}" height="${RING_SIZE}"></canvas></div>`;
    this.container = root.querySelector('.game-container') as HTMLElement;
    this.canvas = root.querySelector('#game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.puncher = new Puncher(160, 340);
    this.victim  = new Victim(360, 340);
    this.victim.setBounds(ringBounds());

    this.combo = new ComboTracker((m) => this.shake(m));
    this.timer = new Timer(data.duration, () => this.finish());
    this.speech = new SpeechBubbleSystem(data.puncher.talks);
    this.hud = new HUD(this.container);
    this.hud.onRageClick(() => this.activateRage('manual'));
    this.recorder = new Recorder(this.canvas, audio.getRecordingStream() ?? undefined);

    this.loop = new GameLoop(this.ctx, (d) => this.update(d), (ctx) => this.render(ctx));

    audio.preload();
  }

  start(): void {
    audio.play('bgm');
    this.recorder.start();
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
    audio.stop('bgm');
    this.hud.destroy();
  }

  private async finish(): Promise<void> {
    this.ended = true;
    this.loop.stop();
    audio.stop('bgm');
    const result = await this.recorder.stop();
    const stats: GameStats = {
      totalHits: this.victim.hitsTaken,
      maxCombo: this.combo.maxCombo,
      damageLevel: this.computeDamageLevel(),
      hitTimestamps: [...this.hitTimestamps],
    };
    this.hud.destroy();
    this.onFinish(stats, result?.blob ?? null, result?.mimeType ?? null);
  }

  private computeDamageLevel(): number {
    const h = this.victim.hitsTaken;
    if (h >= 30) return 4;
    if (h >= 20) return 3;
    if (h >= 10) return 2;
    if (h >=  5) return 1;
    return 0;
  }

  private update(deltaMs: number): void {
    if (this.ended) return;
    this.timeMs += deltaMs;
    this.timer.tick(deltaMs);
    if (this.ended) return;   // timer.tick may have triggered finish
    this.puncher.update(deltaMs, { x: this.victim.x, y: this.victim.y });
    this.victim.update(deltaMs, { x: this.puncher.x, y: this.puncher.y });

    if (this.victim.isKnockedDown && !this.wasVictimKO) {
      this.floatingTexts.push({
        text: 'K.O.!',
        x: this.victim.x,
        y: this.victim.y - 50,
        remainingMs: 600,
        color: '#ff3333',
        size: 36,
      });
    }
    this.wasVictimKO = this.victim.isKnockedDown;

    this.combo.tick(deltaMs);
    this.speech.tick(deltaMs);

    if (this.puncher.state === 'strike' && this.puncher.currentStrikeId() > this.lastResolvedStrikeId) {
      const glove = gloveTipPosition(this.puncherRender(), this.puncher.activeArm);
      const victimCircle = { x: this.victim.x, y: this.victim.y, r: CHARACTER_BODY_R };
      if (circlesIntersect(glove, victimCircle)) {
        this.victim.takeHit({ x: this.puncher.x, y: this.puncher.y });
        this.combo.hit();
        this.hitTimestamps.push(this.timeMs);
        this.speech.maybeTrigger({ x: this.puncher.x, y: this.puncher.y });
        audio.play('hit');
        this.lastResolvedStrikeId = this.puncher.currentStrikeId();
        if (!this.rageTriggered && this.victim.hitsTaken >= GameScene.RAGE_BUTTON_HITS) {
          this.hud.showRageButton();
        }
        this.floatingTexts.push({
          text: '+1',
          x: this.victim.x,
          y: this.victim.y - 30,
          remainingMs: 700,
          color: '#ffeb3b',
          size: 18,
        });
      }
    }

    this.advanceFloatingTexts(deltaMs);
    this.hud.update(this.timer.remainingMs, this.victim.hitsTaken, this.combo.combo);
  }

  private render(ctx: CanvasRenderingContext2D): void {
    drawRing(ctx);
    drawCharacter(ctx, this.puncherRender());
    drawCharacter(ctx, this.victimRender());
    drawDamageOverlay(ctx, this.victim.x, this.victim.y - 50, this.victim.hitsTaken, this.timeMs);
    this.speech.draw(ctx);
    this.drawFloatingTexts(ctx);

    // Watermark — baked into recording
    ctx.save();
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('純屬娛樂 / For Entertainment Only', RING_SIZE - 10, RING_SIZE - 8);
    ctx.restore();
  }

  private puncherRender() {
    return {
      x: this.puncher.x, y: this.puncher.y, facing: 1 as const,
      armAngleL: this.puncher.leftArmAngle(),
      armAngleR: this.puncher.rightArmAngle(),
      avatar: this.data.puncher.avatar, jersey: this.data.puncher.jersey,
      name: this.data.puncher.name, nameColor: '#ffd700',
    };
  }
  private victimRender() {
    const isKO = this.victim.isKnockedDown;
    return {
      x: this.victim.x, y: this.victim.y, facing: -1 as const,
      armAngleL: isKO ? -2.7 : -1.4,
      armAngleR: isKO ?  2.7 :  1.4,
      avatar: this.data.victim.avatar, jersey: this.data.victim.jersey,
      name: this.data.victim.name, nameColor: '#ff6b6b',
      rotation: isKO ? Math.PI / 2 : 0,
      brokenArms: this.victim.armsBroken,
    };
  }

  private activateRage(reason: 'auto' | 'manual'): void {
    if (this.rageTriggered) return;
    this.rageTriggered = true;
    this.puncher.rageMode = true;
    this.hud.hideRageButton();
    const text = reason === 'manual' ? '⚡ 暴怒模式! ⚡' : '⚡ RAGE MODE! ⚡';
    this.floatingTexts.push({
      text,
      x: 256,
      y: 80,
      remainingMs: 2500,
      color: '#ff0000',
      size: 48,
    });
    this.container.classList.add('rage');
  }

  private shake(combo: number): void {
    this.container.classList.add('shake');
    setTimeout(() => this.container.classList.remove('shake'), 300);

    this.floatingTexts.push({
      text: `COMBO x${combo}!`,
      x: this.victim.x,
      y: this.victim.y - 60,
      remainingMs: 1200,
      color: '#ff6b6b',
      size: 28,
    });
  }

  private advanceFloatingTexts(deltaMs: number): void {
    for (const ft of this.floatingTexts) {
      ft.y -= 0.05 * deltaMs;
      ft.remainingMs -= deltaMs;
    }
    this.floatingTexts = this.floatingTexts.filter(ft => ft.remainingMs > 0);
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const ft of this.floatingTexts) {
      const alpha = Math.min(1, ft.remainingMs / 600);
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${ft.size}px sans-serif`;
      ctx.fillStyle = '#000';
      ctx.fillText(ft.text, ft.x + 2, ft.y + 2); // shadow
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }
}
