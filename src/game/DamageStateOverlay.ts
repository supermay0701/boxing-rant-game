export function drawDamageOverlay(ctx: CanvasRenderingContext2D, x: number, headY: number, hits: number, timeMs: number): void {
  // Stars (≥5)
  if (hits >= 5) {
    const starAngle = (timeMs / 200) % (Math.PI * 2);
    for (let i = 0; i < 3; i++) {
      const a = starAngle + (i * Math.PI * 2 / 3);
      drawStar(ctx, x + Math.cos(a) * 22, headY - 18 + Math.sin(a) * 8, 5, '#ffeb3b');
    }
  }
  // Bumps (≥10)
  if (hits >= 10) {
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x - 10, headY - 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // Bloody nose (≥20)
  if (hits >= 20) {
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, headY - 8); ctx.lineTo(x, headY + 6); ctx.stroke();
  }
  // Sweat / dishevelment (≥30)
  if (hits >= 30) {
    ctx.fillStyle = '#5dade2';
    ctx.beginPath(); ctx.arc(x + 18, headY - 15, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 18, headY + 4, 2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    const ai = a + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(ai) * r / 2, cy + Math.sin(ai) * r / 2);
  }
  ctx.closePath();
  ctx.fill();
}
