export class Timer {
  remainingMs: number;
  private fired = false;

  constructor(durationMs: number, private onComplete: () => void = () => {}) {
    this.remainingMs = durationMs;
  }

  tick(deltaMs: number): void {
    this.remainingMs = Math.max(0, this.remainingMs - deltaMs);
    if (this.remainingMs === 0 && !this.fired) {
      this.fired = true;
      this.onComplete();
    }
  }
}
