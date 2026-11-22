// guards.js — the museum's night watch: patrols, vision cones and the chase.
// One clear job: decide what each guard does and whether it can see Wren.
// States: patrol -> suspicious (meter rising) -> investigate -> chase (alarm) -> patrol.

import {
  GUARD_CHASE_SPEED,
  GUARD_INVESTIGATE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_WAIT_SECONDS,
  SPOT_RADIUS,
  TILE,
  VISION_HALF_ANGLE,
  VISION_RANGE,
} from './config.js';
import { angleDiff, angleTo, clamp, distance, segmentHitsRect } from './geometry.js';
import { blocksSight } from './levels.js';

// Can this guard see the player right now? Range, cone angle and a clear line of
// sight past walls and crates; bumping into a guard always gives you away.
export function guardCanSee(guard, px, py, level) {
  const d = distance(guard.x, guard.y, px, py);
  if (d < SPOT_RADIUS) return { seen: true, closeness: 1 };
  if (d > VISION_RANGE) return { seen: false, closeness: 0 };
  const ang = angleTo(guard.x, guard.y, px, py);
  if (Math.abs(angleDiff(ang, guard.facing)) > VISION_HALF_ANGLE) return { seen: false, closeness: 0 };
  if (!hasLineOfSight(guard.x, guard.y, px, py, level)) return { seen: false, closeness: 0 };
  return { seen: true, closeness: 1 - d / VISION_RANGE };
}

// Walk the segment in small steps; any solid tile in the way blocks the sight line.
export function hasLineOfSight(x1, y1, x2, y2, level) {
  const steps = Math.ceil(distance(x1, y1, x2, y2) / (TILE / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (blocksSight(level, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

export class Guard {
  constructor(def) {
    this.waypoints = def.waypoints;
    this.wpIndex = 0;
    this.x = def.waypoints[0].x;
    this.y = def.waypoints[0].y;
    this.facing = 0;
    this.state = 'patrol'; // patrol | investigate | chase
    this.waitTimer = 0;
    this.investigateTarget = null;
    this.lastSeen = null;
    this.stepTimer = 0;
    this.suspicionFlash = 0; // counts down after a "?" pops up
    this.lookTimer = 0; // idle head-turn while waiting at a waypoint
    this.lookAngle = 0;
  }

  // Move toward (tx, ty) at `speed`, sliding along walls. Returns distance left.
  moveToward(tx, ty, speed, dt, level) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return 0;
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step;
    const ny = this.y + (dy / d) * step;
    // Axis-separated collision so guards slide along walls instead of sticking.
    if (!hitsSolid(level, nx, this.y, 13)) this.x = nx;
    if (!hitsSolid(level, this.x, ny, 13)) this.y = ny;
    this.facing = Math.atan2(dy, dx);
    return d - step;
  }

  update(dt, level, player, alarmOn) {
    this.suspicionFlash = Math.max(0, this.suspicionFlash - dt);
    if (alarmOn) {
      this.state = 'chase';
      const left = this.moveToward(player.x, player.y, GUARD_CHASE_SPEED, dt, level);
      this.footstep(dt, GUARD_CHASE_SPEED);
      if (left < 2) this.lastSeen = { x: player.x, y: player.y };
      return;
    }
    if (this.state === 'chase') {
      // The alarm just ended: walk back to the nearest waypoint.
      this.state = 'patrol';
      this.wpIndex = nearestWaypoint(this);
    }
    if (this.state === 'investigate' && this.investigateTarget) {
      const left = this.moveToward(
        this.investigateTarget.x,
        this.investigateTarget.y,
        GUARD_INVESTIGATE_SPEED,
        dt,
        level,
      );
      this.footstep(dt, GUARD_INVESTIGATE_SPEED);
      if (left < 6) {
        this.investigateTarget = null;
        this.state = 'patrol';
        this.waitTimer = GUARD_WAIT_SECONDS;
        this.lookTimer = 1.2;
      }
      return;
    }
    // Patrol: walk the waypoints, pausing and looking around at each one.
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      this.lookTimer -= dt;
      if (this.lookTimer <= 0) {
        this.lookTimer = 1.1;
        this.lookAngle = (Math.random() - 0.5) * 2.2;
      }
      // Scan the room while waiting: face the next waypoint, swaying side to side.
      const target = this.waypoints[(this.wpIndex + 1) % this.waypoints.length];
      const base = angleTo(this.x, this.y, target.x, target.y);
      this.facing = base + Math.sin(this.lookTimer * 2.4) * 0.55;
      if (this.waitTimer <= 0) this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      return;
    }
    const target = this.waypoints[this.wpIndex];
    const left = this.moveToward(target.x, target.y, GUARD_PATROL_SPEED, dt, level);
    this.footstep(dt, GUARD_PATROL_SPEED);
    if (left < 4) {
      this.waitTimer = GUARD_WAIT_SECONDS;
      this.lookTimer = 0.9;
    }
  }

  // Heavy boot sounds: returns how far through a step cycle we are, for the caller
  // to turn into an audible tick by distance.
  footstep(dt, speed) {
    this.stepTimer += dt * (speed / 46);
    if (this.stepTimer >= 1) this.stepTimer -= 1;
  }

  steppedThisFrame(prevTimer) {
    return this.stepTimer < prevTimer;
  }

  goInvestigate(x, y) {
    if (this.state === 'chase') return;
    this.state = 'investigate';
    this.investigateTarget = { x, y };
    this.suspicionFlash = 1.2;
  }

  get mark() {
    if (this.state === 'chase') return '!';
    if (this.state === 'investigate' || this.suspicionFlash > 0) return '?';
    return null;
  }
}

function nearestWaypoint(guard) {
  let best = 0;
  let bestD = Infinity;
  guard.waypoints.forEach((w, i) => {
    const d = distance(guard.x, guard.y, w.x, w.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

// Circle-vs-solid-tiles test shared by guards (the player has its own in player.js).
export function hitsSolid(level, x, y, radius) {
  const minTx = Math.floor((x - radius) / TILE);
  const maxTx = Math.floor((x + radius) / TILE);
  const minTy = Math.floor((y - radius) / TILE);
  const maxTy = Math.floor((y + radius) / TILE);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (level.walls.has(`${tx},${ty}`) || level.crates.has(`${tx},${ty}`)) {
        const rx = tx * TILE;
        const ry = ty * TILE;
        const cx = clamp(x, rx, rx + TILE);
        const cy = clamp(y, ry, ry + TILE);
        if (distance(x, y, cx, cy) < radius) return true;
      }
    }
  }
  return false;
}

// Keep the geometry import used: vision cones are drawn from the guard's facing.
export { segmentHitsRect };
