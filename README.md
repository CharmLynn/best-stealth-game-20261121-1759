# Moonlit Museum

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/CharmLynn/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/CharmLynn/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Moonlit Museum — a top-down 2D stealth game that runs offline in a desktop browser. You are Wren, a shadow-thief stealing moon-crystals from a museum at night: slip past the guards' vision cones, hide behind crates, toss a brass coin to pull a patrol away, grab every crystal, and reach the exit unseen.

## How to play

```sh
node serve.ts   # serves game/ at http://localhost:8080
```

- **WASD / arrows** — move
- **Shift** — sneak (slower, harder to spot, quieter)
- **Click** — toss a brass coin; the nearest guard walks over to look
- **P** — pause · **M** — mute · **R** — restart the wing

Three wings, each harder than the last: The Quiet Gallery, The Marble Hall, The Vault Wing. Guards patrol, pause to look around, get suspicious when they glimpse you, and raise the alarm when the detection meter fills. Break line of sight and the chase ends — but the museum remembers.

## What it is

- `game/` — plain static files, no build step, no network requests, no libraries
- `game/src/` — one file per job: `config.js` (tuning), `levels.js` (the three wings), `geometry.js` (sight lines), `guards.js` (patrols and vision), `player.js` (Wren), `audio.js` (synthesized sounds), `render.js` (the canvas), `game.js` (rules), `main.js` (input and loop)
- `screenshots/` — real renders of the game in a browser
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`

All art and sounds are original and made in code; nothing is copied from another game.

---

<sub>Entered on [make.fun](https://make.fun/?ref=mpd17n5r&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
