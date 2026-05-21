import type { JerseyConfig } from '../setup/types';

export interface CharacterRenderInput {
  x: number;            // body center x
  y: number;            // body center y (chest)
  facing: 1 | -1;       // 1 = facing right, -1 = facing left
  armAngleL: number;    // radians; 0 = straight down
  armAngleR: number;
  avatar: ImageBitmap;
  jersey: JerseyConfig;
  name: string;
  nameColor: string;
  rotation?: number;    // radians, optional
}

const HEAD_R = 28;
const BODY_R = 32;
const ARM_LEN = 50;
const GLOVE_R = 14;
const LEG_R = 11;

export function drawCharacter(ctx: CanvasRenderingContext2D, c: CharacterRenderInput): void {
  const { x, y } = c;

  const hasRotation = c.rotation !== undefined && c.rotation !== 0;
  if (hasRotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(c.rotation!);
    ctx.translate(-x, -y);
  }

  // Legs
  ctx.fillStyle = '#6a5239'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  for (const dx of [-12, 12]) {
    ctx.beginPath(); ctx.arc(x + dx, y + BODY_R + 4, LEG_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // Body (jersey)
  drawBody(ctx, x, y, BODY_R, c.jersey);

  // Head with avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y - BODY_R - 4, HEAD_R, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(c.avatar, x - HEAD_R, y - BODY_R - 4 - HEAD_R, HEAD_R * 2, HEAD_R * 2);
  ctx.restore();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y - BODY_R - 4, HEAD_R, 0, Math.PI * 2); ctx.stroke();

  // Arms with gloves (drawn after head so they appear in front of face)
  drawArm(ctx, x - 15, y - 8, c.armAngleL, '#c0392b');
  drawArm(ctx, x + 15, y - 8, c.armAngleR, '#c0392b');

  // Name label (skip if rotated, to avoid weird upside-down text)
  if (!hasRotation) {
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const text = c.name;
    const w = ctx.measureText(text).width + 12;
    const labelY = y - BODY_R - HEAD_R * 2 - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    roundRect(ctx, x - w / 2, labelY - 12, w, 16, 8); ctx.fill();
    ctx.fillStyle = c.nameColor;
    ctx.fillText(text, x, labelY);
  }

  if (hasRotation) ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, jersey: JerseyConfig): void {
  if (jersey.type === 'preset') {
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, jersey.primary);
    g.addColorStop(0.5, jersey.primary);
    g.addColorStop(0.5, jersey.secondary);
    g.addColorStop(1, jersey.secondary);
    ctx.fillStyle = g;
  } else {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(jersey.bitmap, x - r, y - r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
}

function drawArm(ctx: CanvasRenderingContext2D, shoulderX: number, shoulderY: number, angle: number, gloveColor: string): void {
  const endX = shoulderX + Math.sin(angle) * ARM_LEN;
  const endY = shoulderY + Math.cos(angle) * ARM_LEN;
  ctx.strokeStyle = '#f5d4a3'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(endX, endY); ctx.stroke();
  ctx.fillStyle = gloveColor; ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(endX, endY, GLOVE_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
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

export function gloveTipPosition(c: CharacterRenderInput, side: 'L' | 'R'): { x: number; y: number; r: number } {
  const shoulderX = c.x + (side === 'L' ? -15 : 15);
  const shoulderY = c.y - 8;
  const angle = side === 'L' ? c.armAngleL : c.armAngleR;
  return {
    x: shoulderX + Math.sin(angle) * ARM_LEN,
    y: shoulderY + Math.cos(angle) * ARM_LEN,
    r: GLOVE_R,
  };
}

export const CHARACTER_BODY_R = BODY_R;
