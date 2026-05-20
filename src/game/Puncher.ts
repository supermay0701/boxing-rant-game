export const PUNCH_RANGE = 110;
const WIND_UP_MS = 150;
const STRIKE_MS  = 120;
const RECOVER_MS = 250;
const COOLDOWN_MS = 500;

export type PuncherState = 'idle' | 'wind_up' | 'strike' | 'recover';

export interface Point { x: number; y: number; }

export class Puncher {
  state: PuncherState = 'idle';
  private elapsed = 0;
  private cooldown = 0;
  private strikeId = 0;
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
        if (this.cooldown === 0 && distance(this, victim) <= PUNCH_RANGE) {
          this.state = 'wind_up';
          this.elapsed = 0;
          // remaining continues into wind_up this tick
        } else {
          break; // nothing more to do while idle and out of range / on cooldown
        }
      } else {
        const phaseDuration =
          this.state === 'wind_up' ? WIND_UP_MS :
          this.state === 'strike'  ? STRIKE_MS  :
          RECOVER_MS;
        const needed = phaseDuration - this.elapsed;
        if (remaining < needed) {
          this.elapsed += remaining;
          remaining = 0;
        } else {
          remaining -= needed;
          this.elapsed = 0;
          if (this.state === 'wind_up') {
            this.state = 'strike';
            this.strikeId++;
            enteredStrike = true;
          } else if (this.state === 'strike') {
            this.state = 'recover';
          } else if (this.state === 'recover') {
            this.state = 'idle';
            this.cooldown = COOLDOWN_MS;
            // remaining delta now counts against cooldown — loop continues
          }
        }
      }
    }

    return enteredStrike;
  }

  /** Returns right-arm angle for renderer (0 = down, π/2 = right). */
  rightArmAngle(): number {
    if (this.state === 'wind_up') return 1.0;        // pulled back
    if (this.state === 'strike')  return -1.6;       // forward (rightward)
    if (this.state === 'recover') return 0.5;        // returning
    return 2.5;                                       // resting (down-right)
  }
  leftArmAngle(): number { return 2.5; }
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x; const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
