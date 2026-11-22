// config.js — the numbers that tune Moonlit Museum: sizes, speeds, sight and sound.
// One clear job: hold every tunable constant so the rest of the game never hard-codes one.

export const TILE = 40; // pixels per map tile
export const COLS = 24; // map width in tiles
export const ROWS = 16; // map height in tiles
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640
export const HUD_H = 46; // HUD strip above the map

// The player: a shadow-thief called Wren, stealing moon-crystals from a museum at night.
export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 150; // px per second
export const PLAYER_SNEAK_SPEED = 85; // slower, harder to spot, quieter
export const PLAYER_RUN_MULT = 1.0; // walking is the fastest pace; Shift is the sneak

// Guards and their sight.
export const GUARD_RADIUS = 14;
export const GUARD_PATROL_SPEED = 58;
export const GUARD_INVESTIGATE_SPEED = 92;
export const GUARD_CHASE_SPEED = 138;
export const GUARD_WAIT_SECONDS = 1.6; // pause at each patrol waypoint
export const VISION_RANGE = 185; // how far a guard can see, in pixels
export const VISION_HALF_ANGLE = 0.62; // radians either side of facing (~35 deg)
export const SPOT_RADIUS = 34; // closer than this, a guard spots you even at the cone's edge

// Detection: 0 is unseen, 100 is caught red-handed and the alarm sounds.
export const DETECT_BASE_RATE = 55; // points per second, fully visible at mid range
export const DETECT_CLOSE_MULT = 1.8; // closer than half range
export const DETECT_SNEAK_MULT = 0.45; // sneaking
export const DETECT_STILL_MULT = 0.7; // standing still
export const DETECT_DECAY_RATE = 26; // points per second while unseen
export const SUSPICIOUS_AT = 35; // meter above this: the guard comes to look
export const ALARM_AT = 100;
export const ALARM_GIVE_UP_SECONDS = 3.5; // unseen this long and the chase ends
export const CATCH_DISTANCE = 24; // a chasing guard this close catches Wren

export const START_LIVES = 3;
export const COINS_PER_LEVEL = 3; // brass coins to toss as a distraction

export const COLORS = {
  floor: '#1c2438',
  floorAlt: '#202a41',
  floorDark: '#161d2e',
  wall: '#3a4358',
  wallTop: '#565f78',
  crate: '#6b4f2a',
  crateTop: '#8a6a3b',
  moonPool: 'rgba(150, 190, 255, 0.10)',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 150, 60, 0.30)',
  coneAlarm: 'rgba(255, 70, 70, 0.34)',
  coneEdge: 'rgba(255, 214, 90, 0.55)',
  crystal: '#7fe7ff',
  exitClosed: '#3f7d5a',
  exitOpen: '#54e39a',
  player: '#e8e4d8',
  playerCloak: '#2b3a55',
  guard: '#c94f4f',
  guardHat: '#7a2e2e',
  text: '#e8e4d8',
  textDim: '#9aa5bd',
  hudBg: '#10141f',
  meterBg: '#2a2f3f',
  meterFill: '#ffcf4d',
  meterAlarm: '#ff5347',
};
