export type UpdateFn = (deltaMs: number) => void;
export type RenderFn = (ctx: CanvasRenderingContext2D) => void;

export class GameLoop {
  private running = false;
  private last = 0;
  private rafId = 0;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private update: UpdateFn,
    private render: RenderFn,
  ) {}

  start(): void {
    this.running = true;
    this.last = performance.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const delta = now - this.last;
    this.last = now;
    this.update(delta);
    this.render(this.ctx);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
