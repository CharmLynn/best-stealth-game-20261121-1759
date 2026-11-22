// geometry.js — small, pure shape tests the stealth rules stand on.
// One clear job: answer "does this segment hit a solid tile?" and "is this point inside a cone?"
// No DOM here, so the same code can be unit-tested from Node.

export function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

// Does the segment (x1,y1)-(x2,y2) cross the rectangle? Used for line of sight.
export function segmentHitsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  if (pointInRect(x1, y1, rx, ry, rw, rh) || pointInRect(x2, y2, rx, ry, rw, rh)) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Check each of the four edges with a parametric crossing test.
  const edges = [
    [rx, ry, rx + rw, ry], // top
    [rx + rw, ry, rx + rw, ry + rh], // right
    [rx + rw, ry + rh, rx, ry + rh], // bottom
    [rx, ry + rh, rx, ry], // left
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    const ex = ex2 - ex1;
    const ey = ey2 - ey1;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-9) continue; // parallel
    const t = ((ex1 - x1) * ey - (ey1 - y1) * ex) / denom;
    const u = ((ex1 - x1) * dy - (ey1 - y1) * dx) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}

// Angle from (x1,y1) to (x2,y2), and the smallest difference between two angles.
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
