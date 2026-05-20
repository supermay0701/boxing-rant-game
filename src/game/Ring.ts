export const RING_SIZE = 512;
export const RING_PADDING = 30;

export interface Rect { x: number; y: number; width: number; height: number; }

export function ringBounds(): Rect {
  return {
    x: RING_PADDING,
    y: RING_PADDING,
    width: RING_SIZE - 2 * RING_PADDING,
    height: RING_SIZE - 2 * RING_PADDING,
  };
}

export function drawRing(ctx: CanvasRenderingContext2D): void {
  // Floor
  const grad = ctx.createLinearGradient(0, 0, 0, RING_SIZE);
  grad.addColorStop(0, '#5a2020');
  grad.addColorStop(1, '#3a1010');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, RING_SIZE, RING_SIZE);

  // Outer gold frame
  ctx.strokeStyle = '#d4a017';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, RING_SIZE - 6, RING_SIZE - 6);

  // Ropes
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 3;
  for (const offset of [20, 40]) {
    ctx.beginPath(); ctx.moveTo(0, offset); ctx.lineTo(RING_SIZE, offset); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, RING_SIZE - offset); ctx.lineTo(RING_SIZE, RING_SIZE - offset); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(offset, 0); ctx.lineTo(offset, RING_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(RING_SIZE - offset, 0); ctx.lineTo(RING_SIZE - offset, RING_SIZE); ctx.stroke();
  }
}
