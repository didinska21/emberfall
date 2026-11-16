// A small seeded random generator (mulberry32). The world draws every random number
// from one of these, so a seed fully decides a run: the screenshot scenes replay the
// real rules from a seed and always land on the same frame.

export function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random float in [min, max) drawn from `next`. */
export function range(next, min, max) {
  return min + next() * (max - min);
}

/** A random integer in [min, max] drawn from `next`. */
export function rangeInt(next, min, max) {
  return min + Math.floor(next() * (max - min + 1));
}

/** Clamp `value` into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Linear interpolation between a and b by t in [0, 1]. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
