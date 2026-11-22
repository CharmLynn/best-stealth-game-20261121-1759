// levels.js — the museum's three wings, drawn as text maps, plus guard patrols.
// One clear job: turn a readable map into the walls, crates, crystals, exit and spawn
// a level needs. Legend: '#' wall, 'C' crate (cover that blocks sight), '*' moon-crystal,
// 'E' exit, 'P' Wren's starting tile, '.' open floor.

import { COLS, ROWS, TILE } from './config.js';

const RAW_LEVELS = [
  {
    name: 'The Quiet Gallery',
    subtitle: 'Level 1 — two guards, five crystals',
    hint: 'Stay out of the yellow cones. Hold Shift to sneak.',
    map: [
      '########################',
      '#..........##..........#',
      '#.P....*...##...*......#',
      '#..........##..........#',
      '#..CC......##......CC..#',
      '#..........##..........#',
      '#...#####......#####...#',
      '#...#####......#####...#',
      '#..........##..........#',
      '#..*.......##.......*..#',
      '#..........##..........#',
      '#..CC......##......CC..#',
      '#..........##..........#',
      '#......*...##....E.....#',
      '#..........##..........#',
      '########################',
    ],
    // Patrols are waypoint lists in tile coordinates; a guard walks them in order.
    guards: [
      { waypoints: [[3, 5], [9, 5]] },
      { waypoints: [[14, 10], [21, 10]] },
    ],
    moonPools: [[6, 2, 150], [17, 8, 170], [11, 13, 140]],
  },
  {
    name: 'The Marble Hall',
    subtitle: 'Level 2 — three guards, five crystals',
    hint: 'Crates block sight. A thrown coin pulls a guard away.',
    map: [
      '########################',
      '#...C......##......C...#',
      '#.P....*...##...*......#',
      '#..........##..........#',
      '#..CC..C...##...C..CC..#',
      '#..........##..........#',
      '#....######..######....#',
      '#....######..######....#',
      '#..........##..........#',
      '#..*...C...##...C...*..#',
      '#..........##..........#',
      '#..CC......##......CC..#',
      '#......C...##...C......#',
      '#.....*....##.....E....#',
      '#..........##..........#',
      '########################',
    ],
    guards: [
      { waypoints: [[2, 3], [9, 3]] },
      { waypoints: [[13, 8], [21, 8]] },
      { waypoints: [[13, 13], [20, 13]] },
    ],
    moonPools: [[4, 3, 140], [18, 2, 160], [11, 10, 150], [6, 13, 130]],
  },
  {
    name: 'The Vault Wing',
    subtitle: 'Level 3 — four guards, six crystals',
    hint: 'The vault is tight. Watch the patrols, then move.',
    map: [
      '########################',
      '#..C....##....C....C...#',
      '#.P..*..##..*.......C..#',
      '#.......##.............#',
      '#.CC....##....CC...C...#',
      '#.......##.............#',
      '#..######....######....#',
      '#..######....######....#',
      '#.......##.............#',
      '#..*..C..##..C...*.....#',
      '#.......##.............#',
      '#.CC....##....CC....C..#',
      '#.......##.............#',
      '#..*.....##..*....E....#',
      '#.......##.............#',
      '########################',
    ],
    guards: [
      { waypoints: [[2, 3], [7, 3]] },
      { waypoints: [[14, 3], [21, 3]] },
      { waypoints: [[2, 10], [7, 10]] },
      { waypoints: [[14, 12], [21, 12]] },
    ],
    moonPools: [[5, 2, 140], [17, 5, 160], [11, 9, 150], [20, 13, 140]],
  },
];

// Parse one raw map into the structures the game loop uses.
export function parseLevel(raw) {
  if (raw.map.length !== ROWS) throw new Error(`${raw.name}: map has ${raw.map.length} rows, needs ${ROWS}`);
  const walls = new Set();
  const crates = new Set();
  const crystals = [];
  let exit = null;
  let spawn = null;
  raw.map.forEach((row, y) => {
    if (row.length !== COLS) throw new Error(`${raw.name}: row ${y} is ${row.length} wide, needs ${COLS}`);
    for (let x = 0; x < COLS; x++) {
      const ch = row[x];
      const key = `${x},${y}`;
      if (ch === '#') walls.add(key);
      else if (ch === 'C') crates.add(key);
      else if (ch === '*') crystals.push({ tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false });
      else if (ch === 'E') exit = { tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      else if (ch === 'P') spawn = { tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
    }
  });
  if (!exit) throw new Error(`${raw.name}: no exit tile`);
  if (!spawn) throw new Error(`${raw.name}: no spawn tile`);
  return {
    name: raw.name,
    subtitle: raw.subtitle,
    hint: raw.hint,
    walls,
    crates,
    crystals,
    exit,
    spawn,
    guards: raw.guards.map((g) => ({
      waypoints: g.waypoints.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE })),
    })),
    moonPools: raw.moonPools.map(([tx, ty, r]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, r })),
  };
}

export const LEVELS = RAW_LEVELS.map(parseLevel);

// A tile is solid when Wren and the guards cannot walk through it.
export function isSolidTile(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return level.walls.has(`${tx},${ty}`) || level.crates.has(`${tx},${ty}`);
}

// A solid tile also blocks a guard's line of sight.
export function blocksSight(level, tx, ty) {
  return isSolidTile(level, tx, ty);
}
