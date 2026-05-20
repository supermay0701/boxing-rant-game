export interface Circle { x: number; y: number; r: number; }

export function circlesIntersect(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x; const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy) <= a.r + b.r;
}
