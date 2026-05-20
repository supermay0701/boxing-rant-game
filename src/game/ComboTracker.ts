const TIMEOUT_MS = 1500;
const MILESTONES = [5, 10, 20];

export type MilestoneHandler = (combo: number) => void;

export class ComboTracker {
  combo = 0;
  maxCombo = 0;
  private elapsedSinceLastHit = 0;
  private firedMilestones = new Set<number>();

  constructor(private onMilestone: MilestoneHandler = () => {}) {}

  hit(): void {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.elapsedSinceLastHit = 0;
    if (MILESTONES.includes(this.combo) && !this.firedMilestones.has(this.combo)) {
      this.firedMilestones.add(this.combo);
      this.onMilestone(this.combo);
    }
  }

  tick(deltaMs: number): void {
    if (this.combo === 0) return;
    this.elapsedSinceLastHit += deltaMs;
    if (this.elapsedSinceLastHit >= TIMEOUT_MS) {
      this.combo = 0;
      this.elapsedSinceLastHit = 0;
      this.firedMilestones.clear();
    }
  }
}
