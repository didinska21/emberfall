[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/didinska21/emberfall/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/didinska21/emberfall/reward.svg)](https://make.fun/bounty/best-game-01)

# EMBERFALL — Keeper of the Last Light

An original arcade game for the make.fun **best-game-01** bounty, written in
dependency-free JavaScript and drawn entirely with the canvas 2D API. No build
step, no assets, no network: open `game/index.html` in a desktop browser and play.

## The game

All night, embers rain on a twilight valley. You are the Keeper: glide along the
ridge, catch the falling embers in your lantern, and feed the Great Flame. Shadow
moths descend to drink its light — a moth that reaches the flame takes a bite out
of it, so banish them with a pulse of light (which itself costs a little flame).
The flame always burns down; only caught embers feed it, and the bigger it burns,
the more every catch is worth (Flickering ×1, Bright ×2, Roaring ×3). Wind gusts
shove everything sideways. Survive all five phases of the night — Dusk, First
Dark, Deep Night, The Howling, Last Watch — and dawn breaks: you win. If the
flame reaches zero first, the light goes out.

- **Move** — mouse, or ← / → (A / D)
- **Light pulse** — click, or Space (0.9 s cooldown, costs 2 flame)
- **Start / restart** — click, Enter, or R
- **Pause** — P · **Mute** — M

All sound is synthesised live with WebAudio (a warm pad, catch chimes, the pulse
whoosh, the phase bell, the dawn chord) — there are no audio files.

## Layout

- `main.ts` — the handoff program (Node 22, stdlib only): copies `game/` and
  `screenshots/` to the output directory and writes `dossier.json` with
  `vendor/makefun-game.ts`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `game/index.html` — the page.
- `game/src/config.js` — every tuning number and colour.
- `game/src/random.js` — the seeded RNG that makes runs replayable.
- `game/src/world.js` — the simulation: keeper, embers, moths, wind, flame, phases.
- `game/src/render.js` — all canvas drawing: valley, flame, HUD, screens.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — the WebAudio sound engine.
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=title|play|dawn|dark&seed=N`).
- `game/src/main.js` — the game loop and screen flow.
- `screenshots/` — four real renders of the game (title, play, dawn, the light going out).
- `shots.json` — which scene and seed each screenshot was taken from.
- `serve.ts` — a tiny local server: `node serve.ts`, then open http://localhost:8080.

## Screenshots

The scenes in `shots.json` are staged by playing the real rules forward from a
seed with a built-in pilot, so every screenshot is an honest frame of the game.
Serve `game/`, open `index.html` with the listed query, and capture at 1280×720.

## Competition

An entry for the make.fun bounty
[best-game-01](https://make.fun/bounty/best-game-01) ("Make the best game").
Play it by serving `game/` and opening `index.html` in a desktop browser —
no build step, no network, just static files.

## License

MIT — see `LICENSE`.
