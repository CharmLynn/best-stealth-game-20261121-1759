// render.js — everything the player sees, drawn on one canvas.
// One clear job: turn the game state into the picture. Draw order matters: floor,
// moonlight, vision cones, then walls and crates over the cones (so sight looks
// blocked), then crystals, exit, guards, Wren, and the HUD on top.

import {
  COLORS,
  COLS,
  HUD_H,
  ROWS,
  TILE,
  VIEW_H,
  VIEW_W,
  VISION_HALF_ANGLE,
  VISION_RANGE,
} from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCone(ctx, guard, alarmOn) {
  const color = alarmOn
    ? COLORS.coneAlarm
    : guard.state === 'investigate' || guard.suspicionFlash > 0
      ? COLORS.coneSuspicious
      : COLORS.coneCalm;
  const edge = alarmOn ? 'rgba(255,70,70,0.7)' : COLORS.coneEdge;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, VISION_RANGE, guard.facing - VISION_HALF_ANGLE, guard.facing + VISION_HALF_ANGLE);
  ctx.closePath();
  const grad = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, VISION_RANGE);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(255,214,90,0)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(
    guard.x + Math.cos(guard.facing - VISION_HALF_ANGLE) * VISION_RANGE,
    guard.y + Math.sin(guard.facing - VISION_HALF_ANGLE) * VISION_RANGE,
  );
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(
    guard.x + Math.cos(guard.facing + VISION_HALF_ANGLE) * VISION_RANGE,
    guard.y + Math.sin(guard.facing + VISION_HALF_ANGLE) * VISION_RANGE,
  );
  ctx.stroke();
  ctx.restore();
}

function drawFloor(ctx, level) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const key = `${tx},${ty}`;
      if (level.walls.has(key)) continue;
      ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      // Faint tile grout.
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }
  // Pools of moonlight through the skylights.
  for (const pool of level.moonPools) {
    const grad = ctx.createRadialGradient(pool.x, pool.y, 8, pool.x, pool.y, pool.r);
    grad.addColorStop(0, COLORS.moonPool);
    grad.addColorStop(1, 'rgba(150,190,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pool.x, pool.y, pool.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWallsAndCrates(ctx, level) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const key = `${tx},${ty}`;
      const x = tx * TILE;
      const y = ty * TILE;
      if (level.walls.has(key)) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 7);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (level.crates.has(key)) {
        ctx.fillStyle = COLORS.crate;
        roundRect(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 4);
        ctx.fill();
        ctx.fillStyle = COLORS.crateTop;
        ctx.fillRect(x + 3, y + 3, TILE - 6, 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
      }
    }
  }
}

function drawCrystals(ctx, level, time) {
  for (const c of level.crystals) {
    if (c.taken) continue;
    const pulse = 0.75 + Math.sin(time * 3 + c.x) * 0.25;
    const glow = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 26);
    glow.addColorStop(0, `rgba(127,231,255,${0.55 * pulse})`);
    glow.addColorStop(1, 'rgba(127,231,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 26, 0, Math.PI * 2);
    ctx.fill();
    // A small faceted diamond.
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.crystal;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(-8, -8, 16, 5);
    ctx.restore();
  }
}

function drawExit(ctx, level, open, time) {
  const e = level.exit;
  const glowColor = open ? COLORS.exitOpen : COLORS.exitClosed;
  const pulse = open ? 0.6 + Math.sin(time * 4) * 0.3 : 0.25;
  const glow = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, 34);
  glow.addColorStop(0, `rgba(84,227,154,${pulse})`);
  glow.addColorStop(1, 'rgba(84,227,154,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(e.x, e.y, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = glowColor;
  roundRect(ctx, e.x - 13, e.y - 15, 26, 30, 4);
  ctx.fill();
  ctx.fillStyle = '#0e1a13';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', e.x, e.y + 1);
}

function drawGuard(ctx, guard, alarmOn) {
  ctx.save();
  ctx.translate(guard.x, guard.y);
  // Body: a watchman in a red coat and cap.
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guardHat;
  ctx.beginPath();
  ctx.arc(Math.cos(guard.facing) * 4, Math.sin(guard.facing) * 4, 8, 0, Math.PI * 2);
  ctx.fill();
  // Nose shows the facing at a glance.
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.facing) * 12, Math.sin(guard.facing) * 12, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // "?" while suspicious, "!" while chasing — readable above the head.
  if (guard.mark) {
    const bob = Math.sin(performance.now() / 180) * 2;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    const label = guard.mark;
    ctx.strokeText(label, guard.x, guard.y - 26 + bob);
    ctx.fillStyle = guard.mark === '!' ? '#ff5347' : '#ffcf4d';
    ctx.fillText(label, guard.x, guard.y - 26 + bob);
  }
}

function drawPlayer(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  // A soft shadow pool under Wren, then the hooded figure.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 14, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(11, 9);
  ctx.lineTo(-11, 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(0, -2, 8, 0, Math.PI * 2);
  ctx.fill();
  // The hood's point shows which way Wren faces.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.moveTo(Math.cos(player.facing) * 8, Math.sin(player.facing) * 8 - 2);
  ctx.lineTo(Math.cos(player.facing + 2.6) * 12, Math.sin(player.facing + 2.6) * 12 - 2);
  ctx.lineTo(Math.cos(player.facing - 2.6) * 12, Math.sin(player.facing - 2.6) * 12 - 2);
  ctx.closePath();
  ctx.fill();
  // Sneaking: a faint ring, so the player can tell at a glance.
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(232,228,216,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 17 + Math.sin(time * 4) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCoinMarkers(ctx, game) {
  for (const coin of game.coinsOnFloor) {
    const pulse = 1 + Math.sin(performance.now() / 150) * 0.25;
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 10 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, game) {
  const level = game.level;
  const taken = level.crystals.filter((c) => c.taken).length;
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(level.name, 14, HUD_H / 2 - 8);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Crystals ${taken}/${level.crystals.length}   Coins ${game.player.coins}   Lives ${game.lives}   ${fmtTime(game.time)}`, 14, HUD_H / 2 + 11);

  // Detection meter, top right: fills yellow, then red at alarm.
  const mw = 220;
  const mx = VIEW_W - mw - 16;
  const my = 10;
  ctx.fillStyle = COLORS.meterBg;
  roundRect(ctx, mx, my, mw, 14, 7);
  ctx.fill();
  const frac = game.detection / 100;
  ctx.fillStyle = game.alarmOn ? COLORS.meterAlarm : COLORS.meterFill;
  if (frac > 0.01) {
    roundRect(ctx, mx, my, mw * frac, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.alarmOn ? 'ALARM!' : game.detection > 35 ? 'SPOTTED?' : 'UNSEEN', mx + mw / 2, my + 7);
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('WASD move · Shift sneak · Click toss a coin · P pause', mx - 330, my + 26);
}

export function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,10,18,0.78)';
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H);
  const w = 560;
  const h = 130 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = HUD_H + (VIEW_H - h) / 2;
  ctx.fillStyle = '#141a29';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = accent || COLORS.textDim;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent || COLORS.text;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, y + 44);
  ctx.fillStyle = COLORS.text;
  ctx.font = '16px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, y + 88 + i * 30));
}

export function render(ctx, game, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H + HUD_H);
  ctx.save();
  ctx.translate(0, HUD_H);
  if (game.state === 'title') {
    drawTitleScene(ctx, game, time);
  } else {
    drawFloor(ctx, game.level);
    for (const guard of game.guards) drawCone(ctx, guard, game.alarmOn);
    drawCrystals(ctx, game.level, time);
    drawExit(ctx, game.level, game.exitOpen, time);
    drawWallsAndCrates(ctx, game.level);
    drawCoinMarkers(ctx, game);
    for (const guard of game.guards) drawGuard(ctx, guard, game.alarmOn);
    drawPlayer(ctx, game.player, time);
    // A gentle night vignette: dark corners, readable middle.
    const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.restore();
  drawHud(ctx, game);

  if (game.state === 'title') {
    panel(ctx, 'MOONLIT MUSEUM', [
      'A stealth game: steal every moon-crystal, then slip out unseen.',
      'WASD / arrows — move      Shift — sneak      Click — toss a coin to distract',
      'Yellow cones are watching. Fill the meter and the alarm sounds.',
      'Press Enter or click to begin — Level 1: The Quiet Gallery',
    ], '#7fe7ff');
  } else if (game.state === 'paused') {
    panel(ctx, 'PAUSED', ['Take a breath. The guards wait for no one — except now.', 'Press P to keep sneaking.'], null);
  } else if (game.state === 'levelclear') {
    panel(ctx, `${game.level.name} — CLEARED`, [
      `Crystals ${game.level.crystals.length}/${game.level.crystals.length}   Time ${fmtTime(game.time)}   ${game.ghost ? 'Ghost: never spotted!' : 'Spotted — the museum remembers.'}`,
      game.levelIndex + 1 < game.levelCount ? 'Press Enter for the next wing.' : 'Press Enter to see your haul.',
    ], COLORS.exitOpen);
  } else if (game.state === 'caught') {
    panel(ctx, 'CAUGHT!', [
      'A guard got a hand on Wren. The night is not over yet.',
      game.lives > 0 ? `Press Enter to try this wing again. (${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left)` : 'Press Enter to start the night over.',
    ], '#ff5347');
  } else if (game.state === 'win') {
    panel(ctx, 'THE MOONLIT HAUL', [
      `Every crystal, every wing — and never once in irons.`,
      `Total time ${fmtTime(game.totalTime)}   Ghost wings: ${game.ghostWings}/${game.levelCount}`,
      'Press Enter to play the night again.',
    ], '#7fe7ff');
  } else if (game.state === 'gameover') {
    panel(ctx, 'THE NIGHT ENDS', [
      'Three strikes, and the museum keeps its crystals.',
      'Press Enter to try the night again.',
    ], '#ff5347');
  }
}

// The title screen still shows the museum behind the panel: level 1, mid-patrol.
function drawTitleScene(ctx, game, time) {
  drawFloor(ctx, game.level);
  for (const guard of game.guards) drawCone(ctx, guard, false);
  drawCrystals(ctx, game.level, time);
  drawExit(ctx, game.level, false, time);
  drawWallsAndCrates(ctx, game.level);
  for (const guard of game.guards) drawGuard(ctx, guard, false);
  drawPlayer(ctx, game.player, time);
}
