// game.js — the night itself: states, detection, alarms, crystals and the exit.
// One clear job: own the rules and the clock. Rendering lives in render.js, input
// in main.js, guard brains in guards.js.

import {
  ALARM_AT,
  ALARM_GIVE_UP_SECONDS,
  CATCH_DISTANCE,
  COINS_PER_LEVEL,
  DETECT_BASE_RATE,
  DETECT_CLOSE_MULT,
  DETECT_DECAY_RATE,
  DETECT_SNEAK_MULT,
  DETECT_STILL_MULT,
  START_LIVES,
  SUSPICIOUS_AT,
  VISION_RANGE,
} from './config.js';
import { distance } from './geometry.js';
import { Guard, guardCanSee } from './guards.js';
import { LEVELS } from './levels.js';
import { Player } from './player.js';
import { SoundBank } from './audio.js';

export class Game {
  constructor() {
    this.sounds = new SoundBank();
    this.levelIndex = 0;
    this.levelCount = LEVELS.length;
    this.lives = START_LIVES;
    this.state = 'title'; // title | playing | paused | levelclear | caught | win | gameover
    this.detection = 0;
    this.alarmOn = false;
    this.alarmUnseenTimer = 0;
    this.exitOpen = false;
    this.time = 0; // seconds in this level
    this.totalTime = 0;
    this.ghost = true; // this wing so far without being spotted
    this.ghostWings = 0;
    this.coinsOnFloor = []; // tossed coins guards walk toward
    this._sawSuspicious = false;
    this.loadLevel(0);
  }

  get level() {
    return this._level;
  }

  loadLevel(index) {
    this.levelIndex = index;
    // Fresh copies: parseLevel ran once at import, so re-clone the mutable bits.
    const raw = LEVELS[index];
    this._level = {
      ...raw,
      crystals: raw.crystals.map((c) => ({ ...c, taken: false })),
    };
    this.player = new Player(this._level.spawn);
    this.player.coins = COINS_PER_LEVEL;
    this.guards = this._level.guards.map((g) => new Guard(g));
    this.detection = 0;
    this.alarmOn = false;
    this.alarmUnseenTimer = 0;
    this.exitOpen = false;
    this.time = 0;
    this.ghost = true;
    this.coinsOnFloor = [];
    this._sawSuspicious = false;
  }

  startGame() {
    this.lives = START_LIVES;
    this.totalTime = 0;
    this.ghostWings = 0;
    this.loadLevel(0);
    this.state = 'playing';
  }

  nextLevel() {
    if (this.levelIndex + 1 >= this.levelCount) {
      this.state = 'win';
      this.sounds.win();
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.state = 'playing';
  }

  retryLevel() {
    if (this.lives <= 0) {
      this.startGame();
      return;
    }
    this.loadLevel(this.levelIndex);
    this.state = 'playing';
  }

  togglePause() {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
  }

  // A click on the map tosses a brass coin; the nearest guard goes to look at it.
  tossCoin(mapX, mapY) {
    if (this.state !== 'playing') return;
    if (this.player.coins <= 0) return;
    this.player.coins -= 1;
    this.sounds.coin();
    const coin = { x: mapX, y: mapY, ttl: 6 };
    this.coinsOnFloor.push(coin);
    let nearest = null;
    let nearestD = Infinity;
    for (const guard of this.guards) {
      const d = distance(guard.x, guard.y, mapX, mapY);
      if (d < nearestD) {
        nearestD = d;
        nearest = guard;
      }
    }
    if (nearest && nearestD < 420) nearest.goInvestigate(mapX, mapY);
  }

  update(dt, input) {
    if (this.state !== 'playing') return;
    this.time += dt;
    this.totalTime += dt;

    // The player moves first; the world reacts to where Wren ends up.
    const prevStep = this.player.stepTimer;
    this.player.update(dt, input, this._level);
    if (this.player.stepped) this.sounds.footstep(this.player.sneaking);

    // Detection: the most a guard can see you right now.
    let worstSeen = 0;
    let anySeen = false;
    for (const guard of this.guards) {
      const seen = guardCanSee(guard, this.player.x, this.player.y, this._level);
      if (seen.seen) {
        anySeen = true;
        worstSeen = Math.max(worstSeen, seen.closeness);
      }
    }
    if (anySeen) {
      let rate = DETECT_BASE_RATE * (0.55 + worstSeen);
      if (worstSeen > 0.5) rate *= DETECT_CLOSE_MULT;
      if (this.player.sneaking) rate *= DETECT_SNEAK_MULT;
      if (!this.player.moving) rate *= DETECT_STILL_MULT;
      this.detection += rate * dt;
      if (this.detection >= SUSPICIOUS_AT && !this._sawSuspicious) {
        this._sawSuspicious = true;
        this.sounds.suspicious();
        this.ghost = false;
        // The guard who spotted Wren comes to look.
        for (const guard of this.guards) {
          if (guardCanSee(guard, this.player.x, this.player.y, this._level).seen) {
            guard.goInvestigate(this.player.x, this.player.y);
            break;
          }
        }
      }
    } else {
      this.detection = Math.max(0, this.detection - DETECT_DECAY_RATE * dt);
      if (this.detection < SUSPICIOUS_AT) this._sawSuspicious = false;
    }
    this.detection = Math.min(ALARM_AT, this.detection);

    if (this.detection >= ALARM_AT && !this.alarmOn) {
      this.alarmOn = true;
      this.alarmUnseenTimer = 0;
      this.ghost = false;
      this.sounds.alarm();
    }
    if (this.alarmOn) {
      if (anySeen) this.alarmUnseenTimer = 0;
      else {
        this.alarmUnseenTimer += dt;
        if (this.alarmUnseenTimer >= ALARM_GIVE_UP_SECONDS) {
          this.alarmOn = false;
          this.detection = SUSPICIOUS_AT;
          for (const guard of this.guards) guard.state = 'patrol';
        }
      }
    }

    // Guards move, and their boots are audible by distance — footsteps tell you
    // where a guard is, even around a corner.
    for (const guard of this.guards) {
      const before = guard.stepTimer;
      guard.update(dt, this._level, this.player, this.alarmOn);
      if (guard.stepTimer < before) {
        const d = distance(guard.x, guard.y, this.player.x, this.player.y);
        this.sounds.guardStep(Math.min(1, d / (VISION_RANGE * 1.6)));
      }
      // A chasing guard who reaches Wren ends the wing.
      if (this.alarmOn && distance(guard.x, guard.y, this.player.x, this.player.y) < CATCH_DISTANCE) {
        this.getCaught();
        return;
      }
    }

    // Tossed coins fade after a while.
    for (const coin of this.coinsOnFloor) coin.ttl -= dt;
    this.coinsOnFloor = this.coinsOnFloor.filter((c) => c.ttl > 0);

    // Pick up crystals by walking over them.
    for (const crystal of this._level.crystals) {
      if (!crystal.taken && distance(crystal.x, crystal.y, this.player.x, this.player.y) < 26) {
        crystal.taken = true;
        this.sounds.pickup();
      }
    }
    const allTaken = this._level.crystals.every((c) => c.taken);
    if (allTaken && !this.exitOpen) this.exitOpen = true;

    // The exit only works once every crystal is taken.
    if (this.exitOpen) {
      const e = this._level.exit;
      if (distance(e.x, e.y, this.player.x, this.player.y) < 26) {
        if (this.ghost) this.ghostWings += 1;
        this.sounds.levelClear();
        this.state = 'levelclear';
      }
    }
    void prevStep;
  }

  getCaught() {
    this.lives -= 1;
    this.sounds.caught();
    this.state = this.lives > 0 ? 'caught' : 'gameover';
  }
}
