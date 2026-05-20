import { drawRing, ringBounds, RING_SIZE } from './Ring';
import { drawCharacter, gloveTipPosition, CHARACTER_BODY_R } from './Character';
import { GameLoop } from './GameLoop';
import { Puncher } from './Puncher';
import { Victim } from './Victim';
import { circlesIntersect } from './HitDetect';
import type { SetupData } from '../setup/types';

export interface GameSceneCallbacks {
  onHit?: () => void;
}

export class GameScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private loop: GameLoop;
  private data: SetupData;
  private puncher: Puncher;
  private victim: Victim;
  private lastResolvedStrikeId = 0;
  private cbs: GameSceneCallbacks;

  constructor(root: HTMLElement, data: SetupData, cbs: GameSceneCallbacks = {}) {
    this.data = data;
    this.cbs = cbs;
    root.innerHTML = `<div class="game-container"><canvas id="game-canvas" width="${RING_SIZE}" height="${RING_SIZE}"></canvas></div>`;
    this.canvas = root.querySelector('#game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.puncher = new Puncher(160, 340);
    this.victim  = new Victim(360, 340);
    this.victim.setBounds(ringBounds());

    this.loop = new GameLoop(this.ctx, (d) => this.update(d), (ctx) => this.render(ctx));
  }

  start(): void { this.loop.start(); }
  stop(): void { this.loop.stop(); }

  private update(deltaMs: number): void {
    this.puncher.update(deltaMs, { x: this.victim.x, y: this.victim.y });
    this.victim.update(deltaMs, { x: this.puncher.x, y: this.puncher.y });

    if (this.puncher.state === 'strike' && this.puncher.currentStrikeId() > this.lastResolvedStrikeId) {
      const glove = gloveTipPosition(this.puncherRenderInput(), 'R');
      const victimCircle = { x: this.victim.x, y: this.victim.y, r: CHARACTER_BODY_R };
      if (circlesIntersect(glove, victimCircle)) {
        this.victim.takeHit({ x: this.puncher.x, y: this.puncher.y });
        this.cbs.onHit?.();
        this.lastResolvedStrikeId = this.puncher.currentStrikeId();
      }
    }
  }

  private render(ctx: CanvasRenderingContext2D): void {
    drawRing(ctx);
    drawCharacter(ctx, this.puncherRenderInput());
    drawCharacter(ctx, this.victimRenderInput());
  }

  private puncherRenderInput() {
    return {
      x: this.puncher.x, y: this.puncher.y, facing: 1 as const,
      armAngleL: this.puncher.leftArmAngle(),
      armAngleR: this.puncher.rightArmAngle(),
      avatar: this.data.puncher.avatar, jersey: this.data.puncher.jersey,
      name: this.data.puncher.name, nameColor: '#ffd700',
    };
  }
  private victimRenderInput() {
    return {
      x: this.victim.x, y: this.victim.y, facing: -1 as const,
      armAngleL: 2.5, armAngleR: 2.5,
      avatar: this.data.victim.avatar, jersey: this.data.victim.jersey,
      name: this.data.victim.name, nameColor: '#ff6b6b',
    };
  }
}
