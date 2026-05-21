export function drawDamageOverlay(ctx: CanvasRenderingContext2D, x: number, headY: number, hits: number, timeMs: number): void {
  // Stars (≥5) — dizzy stars rotating
  if (hits >= 5) {
    const starAngle = (timeMs / 200) % (Math.PI * 2);
    for (let i = 0; i < 4; i++) {
      const a = starAngle + (i * Math.PI / 2);
      drawStar(ctx, x + Math.cos(a) * 26, headY - 24 + Math.sin(a) * 10, 6, '#ffeb3b');
    }
  }

  // Bruise patch (≥8) — semi-transparent purple-red blob over cheek area
  if (hits >= 8) {
    ctx.save();
    ctx.fillStyle = 'rgba(139, 0, 80, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x - 12, headY + 4, 8, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Black eye (≥12) — dark oval around eye area
  if (hits >= 12) {
    ctx.save();
    ctx.fillStyle = 'rgba(40, 10, 40, 0.65)';
    ctx.beginPath();
    ctx.ellipse(x + 9, headY - 5, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Bloody nose (≥16) — red drop from nose
  if (hits >= 16) {
    ctx.save();
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#7a1a14';
    ctx.lineWidth = 1;
    // Drop shape
    ctx.beginPath();
    ctx.moveTo(x, headY);
    ctx.lineTo(x - 3, headY + 14);
    ctx.lineTo(x + 3, headY + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Smaller drop dripping
    const dripOffset = (timeMs / 300) % 10;
    ctx.beginPath();
    ctx.arc(x, headY + 16 + dripOffset, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Bandage (≥20) — white cross over forehead
  if (hits >= 20) {
    ctx.save();
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    // Horizontal strip
    ctx.fillRect(x - 14, headY - 18, 28, 5);
    ctx.strokeRect(x - 14, headY - 18, 28, 5);
    // Vertical strip (cross)
    ctx.fillRect(x - 3, headY - 23, 6, 14);
    ctx.strokeRect(x - 3, headY - 23, 6, 14);
    // Stitches dots on bandage
    ctx.fillStyle = '#222';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(x - 10 + i * 5, headY - 15, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cheek scratch + sweat drops (≥25)
  if (hits >= 25) {
    ctx.save();
    // Diagonal scratch on left cheek
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 18, headY + 2);
    ctx.lineTo(x - 8, headY + 12);
    ctx.stroke();
    // Sweat drops
    ctx.fillStyle = '#5dade2';
    ctx.beginPath(); ctx.arc(x + 20, headY - 14, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 22, headY + 8, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Tooth knocked out (≥30) — small white square at mouth, slightly to side
  if (hits >= 30) {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.fillRect(x - 4, headY + 8, 4, 5);
    ctx.strokeRect(x - 4, headY + 8, 4, 5);
    // Black gap next to tooth
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, headY + 8, 3, 5);
    ctx.restore();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 1;
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
  ctx.stroke();
}
