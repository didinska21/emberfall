// Screenshot staging behind ?shot=title|play|dawn|dark&seed=N. Each scene resets the
// world and plays the real rules forward with a pilot, so the frame is an honest
// moment of the game — and because the world is seeded, the same seed always stages
// the same frame. shots.json at the repository root lists the four scenes.

import { FLAME, KEEPER, STEP } from './config.js';
import { SCREEN_DAWN, SCREEN_DARK, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

export const SHOT_NAMES = ['title', 'play', 'dawn', 'dark'];

/** Read a ?shot= request from a query string; null when there is none. */
export function readShotRequest(search) {
  const params = new URLSearchParams(search);
  const name = params.get('shot');
  if (!name || !SHOT_NAMES.includes(name)) return null;
  const seed = Number.parseInt(params.get('seed') ?? '7', 10);
  return { name, seed: Number.isFinite(seed) ? seed : 7 };
}

/**
 * The keeper's better self: chase the ember that lands soonest, and pulse whenever
 * a moth strays inside the lantern's reach. Used for the play and dawn scenes.
 */
function skilledPilot(world) {
  let target = null;
  let bestTime = Infinity;
  for (const e of world.embers) {
    if (!e.active) continue;
    const landsIn = (KEEPER.lanternY - e.y) / Math.max(40, e.vy);
    if (landsIn < bestTime) {
      bestTime = landsIn;
      target = e;
    }
  }
  let pulse = false;
  if (world.pulseTimer <= 0) {
    for (const m of world.moths) {
      if (!m.active) continue;
      const dx = m.x - world.keeperX;
      const dy = m.y - KEEPER.lanternY;
      if (dx * dx + dy * dy < (KEEPER.pulseRadius * 0.92) ** 2) {
        pulse = true;
        break;
      }
    }
  }
  const goalX = target ? target.x : FLAME.x;
  const move = Math.max(-1, Math.min(1, (goalX - world.keeperX) / 70));
  return { move, pulse };
}

/** A keeper who has given up: flees every ember and never pulses. The dark scene. */
function doomedPilot(world) {
  let nearest = null;
  let best = Infinity;
  for (const e of world.embers) {
    if (!e.active) continue;
    const d = Math.abs(e.x - world.keeperX);
    if (d < best) {
      best = d;
      nearest = e;
    }
  }
  if (!nearest || best > 190) return { move: 0, pulse: false };
  return { move: nearest.x > world.keeperX ? -1 : 1, pulse: false };
}

function run(world, pilot, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps && !world.over; i += 1) {
    const { move, pulse } = pilot(world);
    world.step(move, pulse);
  }
}

/**
 * Stage the named scene in `world` (already built with the scene's seed) and return
 * the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    run(world, skilledPilot, 47);
    // End on a flourish: a fresh pulse, caught a few steps into its ring.
    if (!world.over && world.pulseTimer <= 0) {
      world.pulse();
      for (let i = 0; i < 5; i += 1) world.step(0, false);
    }
    return SCREEN_PLAY;
  }
  if (name === 'dawn') {
    run(world, skilledPilot, 200);
    return world.won ? SCREEN_DAWN : SCREEN_PLAY;
  }
  if (name === 'dark') {
    run(world, doomedPilot, 220);
    return world.over && !world.won ? SCREEN_DARK : SCREEN_PLAY;
  }
  // Title: a few seconds of gentle, unattended valley behind the logo.
  run(world, skilledPilot, 5);
  return SCREEN_TITLE;
}
