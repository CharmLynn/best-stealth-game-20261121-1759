// main.js — the front door: canvas, keyboard and mouse, the game loop, and the
// screenshot modes. One clear job: wire input to the game and the game to the screen.
// ?shot=start|play|alert|win renders a fixed scene for screenshots (see shots.json).

import { HUD_H, VIEW_H, VIEW_W } from './config.js';
import { Game } from './game.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H + HUD_H;

const game = new Game();
// Exposed for play-testing (and for nothing else): the harness reads positions here.
window.__game = game;

const input = { up: false, down: false, left: false, right: false, sneak: false };

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

function advanceFromPanel() {
  if (game.state === 'title') game.startGame();
  else if (game.state === 'levelclear') game.nextLevel();
  else if (game.state === 'caught') game.retryLevel();
  else if (game.state === 'win' || game.state === 'gameover') game.startGame();
}

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  game.sounds.ensure();
  const mapped = KEYMAP[event.code];
  if (mapped) {
    input[mapped] = true;
    event.preventDefault();
    return;
  }
  if (event.code === 'Enter' || event.code === 'Space') {
    advanceFromPanel();
    event.preventDefault();
  } else if (event.code === 'KeyP' || event.code === 'Escape') {
    game.togglePause();
  } else if (event.code === 'KeyM') {
    game.sounds.muted = !game.sounds.muted;
  } else if (event.code === 'KeyR' && game.state === 'playing') {
    game.retryLevel();
  }
});

window.addEventListener('keyup', (event) => {
  const mapped = KEYMAP[event.code];
  if (mapped) input[mapped] = false;
});

canvas.addEventListener('mousedown', (event) => {
  game.sounds.ensure();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY - HUD_H;
  if (game.state === 'title' || game.state === 'levelclear' || game.state === 'caught'
    || game.state === 'win' || game.state === 'gameover') {
    advanceFromPanel();
    return;
  }
  if (y >= 0) game.tossCoin(x, y);
});

// A fixed scene for each screenshot: the same level, guards and cones every time,
// so the screenshots are real renders of the game's own code, never staged images.
// Shot scenes are frozen (no updates) so a guard can never catch Wren mid-shot.
function applyShotMode() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  game.sounds.muted = true;
  game.frozen = true;
  const placeGuard = (i, tx, ty, facing) => {
    const g = game.guards[i];
    g.x = (tx + 0.5) * 40;
    g.y = (ty + 0.5) * 40;
    g.facing = facing;
  };
  if (shot === 'start') {
    game.loadLevel(0);
    game.state = 'title';
  } else if (shot === 'play') {
    game.loadLevel(1);
    game.state = 'playing';
    game.player.x = 460;
    game.player.y = 300;
    game.player.sneaking = true;
    game.level.crystals[0].taken = true;
    game.level.crystals[1].taken = true;
    game.detection = 12;
    placeGuard(0, 5, 3, 0);
    placeGuard(1, 17, 8, Math.PI);
    placeGuard(2, 16, 13, 0);
  } else if (shot === 'alert') {
    game.loadLevel(2);
    game.state = 'playing';
    game.player.x = 420;
    game.player.y = 130;
    game.player.sneaking = true;
    game.detection = 68;
    placeGuard(0, 4, 3, 0);
    placeGuard(1, 14, 3, Math.PI);
    game.guards[1].goInvestigate(420, 130);
    placeGuard(2, 5, 10, 0);
    placeGuard(3, 17, 12, Math.PI);
  } else if (shot === 'win') {
    game.loadLevel(0);
    game.state = 'playing';
    for (const c of game.level.crystals) c.taken = true;
    game.exitOpen = true;
    game.player.x = game.level.exit.x;
    game.player.y = game.level.exit.y - 30;
    game.state = 'levelclear';
    game.ghost = true;
    game.time = 96;
  }
}

applyShotMode();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.frozen) game.update(dt, input);
  render(ctx, game, now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
