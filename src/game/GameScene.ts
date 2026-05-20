import { drawRing, RING_SIZE } from './Ring';
import { drawCharacter } from './Character';
import { GameLoop } from './GameLoop';
import type { SetupData } from '../setup/types';

export class GameScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private loop: GameLoop;
  private data: SetupData;

  constructor(root: HTMLElement, data: SetupData) {
    this.data = data;
    root.innerHTML = `
      <div class="game-container">
        <canvas id="game-canvas" width="${RING_SIZE}" height="${RING_SIZE}"></canvas>
      </div>
    `;
    this.canvas = root.querySelector('#game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.loop = new GameLoop(this.ctx, () => this.update(), (ctx) => this.render(ctx));
  }

  start(): void { this.loop.start(); }
  stop(): void { this.loop.stop(); }

  private update(): void {
    // populated in later tasks
  }

  private render(ctx: CanvasRenderingContext2D): void {
    drawRing(ctx);
    drawCharacter(ctx, {
      x: 150, y: 350, facing: 1, armAngleL: 2.5, armAngleR: -2.5,
      avatar: this.data.puncher.avatar, jersey: this.data.puncher.jersey,
      name: this.data.puncher.name, nameColor: '#ffd700',
    });
    drawCharacter(ctx, {
      x: 360, y: 350, facing: -1, armAngleL: 2.5, armAngleR: -2.5,
      avatar: this.data.victim.avatar, jersey: this.data.victim.jersey,
      name: this.data.victim.name, nameColor: '#ff6b6b',
    });
  }
}
