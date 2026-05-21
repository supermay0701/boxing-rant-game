export const PUNCH_RANGE = 110;
const CHASE_SPEED_PX_PER_FRAME = 0.5;
const WIND_UP_MS = 150;
const STRIKE_MS  = 120;
const RECOVER_MS = 250;
const COOLDOWN_MS = 500;
const RAGE_SPEED_MULTIPLIER = 10;

export type PuncherState = 'idle' | 'wind_up' | 'strike' | 'recover';

export interface Point { x: number; y: number; }

export class Puncher {
  state: PuncherState = 'idle';
  private elapsed = 0;
  private cooldown = 0;
  private strikeId = 0;
  activeArm: 'L' | 'R' = 'R';
  rageMode = false;
  currentStrikeId(): number { return this.strikeId; }

  constructor(public x: number, public y: number) {}

  /** call once per frame. Returns true on the first frame of strike (use for combo etc.). */
  update(deltaMs: number, victim: Point): boolean {
    let enteredStrike = false;
    let remaining = deltaMs;

    while (remaining > 0) {
      if (this.state === 'idle') {
        const cdUsed = Math.min(remaining, this.cooldown);
        this.cooldown = Math.max(0, this.cooldown - remaining);
        remaining -= cdUsed;
        const distToVictim = distance(this, victim);
        if (this.cooldown === 0 && distToVictim <= PUNCH_RANGE) {
          this.activeArm = this.activeArm === 'R' ? 'L' : 'R';
          this.state = 'wind_up';
          this.elapsed = 0;
          // remaining continues into wind_up this tick
        } else {
          if (distToVictim > PUNCH_RANGE) {
            // Chase: move slowly toward victim
            const dx = victim.x - this.x;
            const dy = victim.y - this.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const speedMult = this.rageMode ? RAGE_SPEED_MULTIPLIER : 1;
            const step = CHASE_SPEED_PX_PER_FRAME * speedMult * (deltaMs / 16);
            this.x += (dx / len) * step;
            this.y += (dy / len) * step;
          }
          break; // nothing more to do while idle and out of range / on cooldown
        }
      } else {
        this.elapsed += remaining;
        const mult = this.rageMode ? RAGE_SPEED_MULTIPLIER : 1;
        if (this.state === 'wind_up' && this.elapsed >= WIND_UP_MS / mult) {
          this.state = 'strike'; this.elapsed = 0;
          this.strikeId++;
          enteredStrike = true;
        } else if (this.state === 'strike' && this.elapsed >= STRIKE_MS / mult) {
          this.state = 'recover'; this.elapsed = 0;
        } else if (this.state === 'recover' && this.elapsed >= RECOVER_MS / mult) {
          this.state = 'idle'; this.elapsed = 0;
          this.cooldown = COOLDOWN_MS / mult;
        }
        remaining = 0;
      }
    }

    return enteredStrike;
  }

  /** Returns right-arm angle for renderer (0 = down, π/2 = right). */
  rightArmAngle(): number {
    if (this.activeArm !== 'R') return 2.5;  // resting
    if (this.state === 'wind_up') return 1.0;
    if (this.state === 'strike')  return -1.6;
    if (this.state === 'recover') return 0.5;
    return 2.5;
  }
  leftArmAngle(): number {
    if (this.activeArm !== 'L') return 2.5;  // resting
    if (this.state === 'wind_up') return -1.0;  // mirror of right
    if (this.state === 'strike')  return 1.6;   // mirror
    if (this.state === 'recover') return -0.5;
    return 2.5;
  }
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x; const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
