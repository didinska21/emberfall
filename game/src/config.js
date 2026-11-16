// EMBERFALL tuning: every size, speed, colour and rule constant lives here, so the
// simulation, the renderer and the screenshot staging all read the same numbers.
// The valley is a fixed 1280x720 logical field; the renderer scales it to the window.

export const FIELD = { width: 1280, height: 720, ridgeY: 636 };

/** The simulation's fixed step: 60 updates a second at any display rate. */
export const STEP = 1 / 60;

/** The Great Flame burns at the centre of the ridge; its size is the game's heart. */
export const FLAME = {
  x: 640,
  baseY: 632,
  start: 56,
  max: 100,
  decayPerSecond: 0.62,
  emberFeed: 3.4,
  mothBite: 9,
  pulseCost: 2,
};

/** Flame tiers: a bigger flame scores every catch at a higher multiplier. */
export const TIERS = [
  { min: 66, name: 'ROARING', multiplier: 3 },
  { min: 33, name: 'BRIGHT', multiplier: 2 },
  { min: 0, name: 'FLICKERING', multiplier: 1 },
];

export const KEEPER = {
  startX: 640,
  speed: 640,
  lanternY: 556,
  catchRadius: 52,
  pulseRadius: 168,
  pulseCooldown: 0.9,
};

export const EMBER = {
  points: 25,
  firstDelay: 0.4,
  interval: 0.85,
  intervalPerPhase: 0.07,
  fallMin: 118,
  fallMax: 185,
  fallPerPhase: 17,
  sway: 26,
};

export const MOTH = {
  points: 10,
  firstDelay: 2.2,
  interval: 2.7,
  intervalPerPhase: 0.42,
  fallMin: 92,
  fallMax: 138,
  fallPerPhase: 13,
  homePull: 26,
};

/** The night is five phases; surviving the last one brings the dawn and the win. */
export const NIGHT = {
  phases: 5,
  phaseSeconds: 24,
  names: ['DUSK', 'FIRST DARK', 'DEEP NIGHT', 'THE HOWLING', 'LAST WATCH'],
};

/** Wind gusts: a sideways push on everything falling, announced before it arrives. */
export const WIND = {
  calmMin: 5,
  calmMax: 9,
  gustSeconds: 3.2,
  strength: 130,
};

export const POOLS = { embers: 48, moths: 40, particles: 420, floaters: 24 };

export const PALETTE = {
  skyTop: '#070b26',
  skyMid: '#1b1140',
  skyLow: '#3d1d55',
  horizon: '#8a3b2e',
  ridgeFar: '#241a4d',
  ridgeMid: '#171233',
  ridgeNear: '#0d0a24',
  stone: '#2a2340',
  stoneDark: '#191430',
  emberCore: '#fff3c4',
  ember: '#ffb347',
  emberDeep: '#ff7b2f',
  moth: '#241b3a',
  mothWing: '#6d5bd0',
  mothEye: '#c9b8ff',
  flameCore: '#fff6d8',
  flameMid: '#ffb347',
  flameOuter: '#ff6a2a',
  flameTip: '#e83e1d',
  text: '#f5ead2',
  muted: '#a79bc9',
  teal: '#57e6c9',
  danger: '#ff5470',
};

export const FONT = '"Avenir Next", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberfall.best';
