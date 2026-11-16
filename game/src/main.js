// EMBERFALL's entry point: sizes the canvas, runs the fixed-step loop, and walks the
// screens — title, play, dawn (a win) and dark (a loss) — wiring the world, the
// renderer, the input and the sound engine together. With ?shot= in the address it
// stages one deterministic scene instead and holds it, for the maker's screenshots.

import { BEST_KEY, FIELD, STEP } from './config.js';
import { World, SCREEN_DAWN, SCREEN_DARK, SCREEN_PLAY, SCREEN_TITLE, EVENT_BANISH, EVENT_BITE, EVENT_CATCH, EVENT_OVER, EVENT_PHASE, EVENT_PULSE } from './world.js';
import { renderFrame } from './render.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { readShotRequest, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

let view = { scale: 1, offsetX: 0, offsetY: 0 };

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
  view = {
    scale,
    offsetX: (canvas.width - FIELD.width * scale) / 2,
    offsetY: (canvas.height - FIELD.height * scale) / 2,
  };
}
window.addEventListener('resize', resize);
resize();

function toLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const dpr = canvas.width / rect.width;
  return {
    x: (clientX * dpr - view.offsetX) / view.scale,
    y: (clientY * dpr - view.offsetY) / view.scale,
  };
}

function loadBest() {
  try {
    return Number.parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // A browser that refuses storage simply keeps no best score.
  }
}

const sound = new SoundEngine();
const input = new Input(canvas, toLogical);
let best = loadBest();
let muted = false;
let paused = false;

const shot = readShotRequest(window.location.search);
let world;
let screen;

if (shot) {
  world = new World(shot.seed);
  screen = stageShot(shot.name, world);
} else {
  world = new World((Date.now() % 90000) + 11);
  screen = SCREEN_TITLE;
}

function announce(text) {
  if (status) status.textContent = text;
}
announce(screen === SCREEN_TITLE ? 'EMBERFALL. Press Enter to begin.' : `EMBERFALL, ${screen} scene.`);

function startGame() {
  sound.start();
  world = new World((Date.now() % 90000) + 11);
  screen = SCREEN_PLAY;
  paused = false;
  input.clearQueued();
  announce('The night begins. Catch embers, keep the flame alive until dawn.');
}

function finishGame() {
  screen = world.won ? SCREEN_DAWN : SCREEN_DARK;
  if (world.score > best) {
    best = world.score;
    saveBest(best);
  }
  if (world.won) sound.dawnChord();
  else sound.darkFall();
  input.clearQueued();
  announce(world.won ? `Dawn breaks. Score ${world.score}.` : `The light went out. Score ${world.score}.`);
}

/** Behind the title the keeper tends the flame alone, drifting to the nearest ember. */
function attractMove() {
  let target = null;
  let lowest = -Infinity;
  for (const e of world.embers) {
    if (e.active && e.y > lowest) {
      lowest = e.y;
      target = e;
    }
  }
  if (!target) return 0;
  return Math.max(-1, Math.min(1, (target.x - world.keeperX) / 80));
}

function playEvents(events) {
  if (events & EVENT_CATCH) sound.catchChime(world.tier.multiplier);
  if (events & EVENT_BANISH) sound.banishPop();
  if (events & EVENT_PULSE) sound.pulseWhoosh();
  if (events & EVENT_BITE) sound.biteThud();
  if (events & EVENT_PHASE) sound.phaseBell();
}

let last = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let delta = (now - last) / 1000;
  last = now;
  if (delta > 0.1) delta = 0.1;
  accumulator += delta;

  if (!shot) {
    while (accumulator >= STEP) {
      accumulator -= STEP;
      if (input.take('mute')) {
        muted = !muted;
        sound.setMuted(muted);
      }
      if (screen === SCREEN_TITLE) {
        // The valley lives behind the title: the keeper tends the flame alone.
        const events = world.step(attractMove(), false);
        if (events & EVENT_OVER) world.reset();
        if (input.take('confirm')) startGame();
      } else if (screen === SCREEN_PLAY) {
        if (input.take('pause')) paused = !paused;
        if (!paused) {
          const events = world.step(input.steer(world.keeperX), input.take('pulse'));
          playEvents(events);
          if (events & EVENT_OVER) finishGame();
        }
      } else {
        // End screens: let the sparks keep drifting behind the panel.
        world.time += STEP;
        world.stepParticles();
        if (input.take('confirm')) startGame();
      }
    }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05040f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
  renderFrame(ctx, world, screen, best);
  if (paused && screen === SCREEN_PLAY) {
    ctx.fillStyle = 'rgba(5,4,20,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#f5ead2';
    ctx.font = '800 44px "Avenir Next", "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2);
  }
}

requestAnimationFrame(frame);
