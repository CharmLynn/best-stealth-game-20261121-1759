// player.js — Wren, the shadow-thief: movement, sneaking and the brass coin.
// One clear job: turn keyboard and mouse input into a position on the map.

import { PLAYER_RADIUS, PLAYER_SNEAK_SPEED, PLAYER_WALK_SPEED, TILE } from './config.js';
import { clamp, distance } from './geometry.js';
import { isSolidTile } from './levels.js';

export class Player {
  constructor(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.facing = -Math.PI / 2; // starts looking up the gallery
    this.sneaking = false;
    this.moving = false;
    this.stepTimer = 0;
    this.stepped = false; // set true on the frame a footstep lands
    this.coins = 0;
  }

  reset(spawn, coins) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.facing = -Math.PI / 2;
    this.sneaking = false;
    this.moving = false;
    this.coins = coins;
  }

  update(dt, input, level) {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    this.sneaking = !!input.sneak;
    this.moving = dx !== 0 || dy !== 0;
    if (!this.moving) {
      this.stepped = false;
      return;
    }
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const speed = this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    this.facing = Math.atan2(dy, dx);
    // Axis-separated movement so Wren slides along walls instead of sticking.
    const nx = this.x + dx * speed * dt;
    if (!circleHitsSolid(level, nx, this.y, PLAYER_RADIUS)) this.x = nx;
    const ny = this.y + dy * speed * dt;
    if (!circleHitsSolid(level, this.x, ny, PLAYER_RADIUS)) this.y = ny;
    // Footsteps: one tick per stride, slower while sneaking.
    this.stepped = false;
    this.stepTimer += dt * (speed / 52);
    if (this.stepTimer >= 1) {
      this.stepTimer -= 1;
      this.stepped = true;
    }
  }
}

// Circle-vs-solid-tiles: only the tiles the circle overlaps are tested.
export function circleHitsSolid(level, x, y, radius) {
  const minTx = Math.floor((x - radius) / TILE);
  const maxTx = Math.floor((x + radius) / TILE);
  const minTy = Math.floor((y - radius) / TILE);
  const maxTy = Math.floor((y + radius) / TILE);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (isSolidTile(level, tx, ty)) {
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
