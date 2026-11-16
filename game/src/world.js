// The EMBERFALL simulation: the keeper, the falling embers, the moths, the wind and
// the Great Flame, advanced in fixed steps. It touches no DOM and draws every random
// number from one seeded generator, so any run can be replayed exactly — the live
// game, the autopilot and the screenshot scenes all step this same world.

import {
  EMBER, FIELD, FLAME, KEEPER, MOTH, NIGHT, POOLS, STEP, TIERS, WIND,
} from './config.js';
import { clamp, lerp, makeRandom, range } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DAWN = 'dawn';
export const SCREEN_DARK = 'dark';

export const EVENT_CATCH = 1;
export const EVENT_BANISH = 2;
export const EVENT_BITE = 4;
export const EVENT_PULSE = 8;
export const EVENT_PHASE = 16;
export const EVENT_OVER = 32;

function makePool(size, make) {
  const pool = [];
  for (let i = 0; i < size; i += 1) pool.push(make());
  return pool;
}

function freeSlot(pool) {
  for (let i = 0; i < pool.length; i += 1) if (!pool[i].active) return pool[i];
  return null;
}

/** The flame's scoring tier for a given size: bigger flame, richer catches. */
export function tierFor(size) {
  for (let i = 0; i < TIERS.length; i += 1) if (size >= TIERS[i].min) return TIERS[i];
  return TIERS[TIERS.length - 1];
}

export class World {
  constructor(seed) {
    this.random = makeRandom(seed);
    this.embers = makePool(POOLS.embers, () => ({
      active: false, x: 0, y: 0, vy: 0, swayPhase: 0, swaySpeed: 0, size: 1,
    }));
    this.moths = makePool(POOLS.moths, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, flap: 0, scale: 1,
    }));
    this.particles = makePool(POOLS.particles, () => ({
      active: false, kind: 'spark', x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0,
    }));
    this.floaters = makePool(POOLS.floaters, () => ({
      active: false, x: 0, y: 0, life: 0, text: '', colour: '#fff',
    }));
    this.reset();
  }

  reset() {
    const next = this.random;
    for (const list of [this.embers, this.moths, this.particles, this.floaters]) {
      for (const item of list) item.active = false;
    }
    this.time = 0;
    this.keeperX = KEEPER.startX;
    this.keeperLean = 0;
    this.flame = FLAME.start;
    this.flameFlicker = next() * 10;
    this.score = 0;
    this.caught = 0;
    this.banished = 0;
    this.phase = 0;
    this.phaseTime = 0;
    this.emberTimer = EMBER.firstDelay;
    this.mothTimer = MOTH.firstDelay;
    this.pulseTimer = 0;
    this.pulseAge = 99;
    this.wind = 0;
    this.windTarget = 0;
    this.windTimer = range(next, WIND.calmMin, WIND.calmMax);
    this.windState = 'calm';
    this.shake = 0;
    this.over = false;
    this.won = false;
    this.spawnAmbient();
  }

  /** Ambient drifting motes and flame sparks, so even a still frame feels alive. */
  spawnAmbient() {
    const next = this.random;
    for (let i = 0; i < 26; i += 1) {
      const mote = freeSlot(this.particles);
      if (!mote) break;
      mote.active = true;
      mote.kind = 'mote';
      mote.x = next() * FIELD.width;
      mote.y = next() * FIELD.ridgeY;
      mote.vx = range(next, -6, 6);
      mote.vy = range(next, -11, -4);
      mote.maxLife = mote.life = range(next, 6, 14);
      mote.size = range(next, 0.8, 2.2);
      mote.hue = next();
    }
  }

  spawnParticle(kind, x, y, options) {
    const p = freeSlot(this.particles);
    if (!p) return;
    const next = this.random;
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = options.vx ?? range(next, -30, 30);
    p.vy = options.vy ?? range(next, -30, 30);
    p.maxLife = p.life = options.life ?? 0.7;
    p.size = options.size ?? 2;
    p.hue = next();
  }

  burst(x, y, kind, count, speed, life, size) {
    const next = this.random;
    for (let i = 0; i < count; i += 1) {
      const angle = next() * Math.PI * 2;
      const power = speed * (0.3 + next() * 0.7);
      this.spawnParticle(kind, x, y, {
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power - speed * 0.25,
        life: life * (0.6 + next() * 0.7),
        size: size * (0.6 + next() * 0.8),
      });
    }
  }

  addFloater(x, y, text, colour) {
    const f = freeSlot(this.floaters);
    if (!f) return;
    f.active = true;
    f.x = x;
    f.y = y;
    f.life = 1.1;
    f.text = text;
    f.colour = colour;
  }

  spawnEmber() {
    const e = freeSlot(this.embers);
    if (!e) return;
    const next = this.random;
    e.active = true;
    e.x = range(next, 36, FIELD.width - 36);
    e.y = -16;
    e.vy = range(next, EMBER.fallMin, EMBER.fallMax) + this.phase * EMBER.fallPerPhase;
    e.swayPhase = next() * Math.PI * 2;
    e.swaySpeed = range(next, 0.9, 1.7);
    e.size = range(next, 0.8, 1.25);
  }

  spawnMoth() {
    const m = freeSlot(this.moths);
    if (!m) return;
    const next = this.random;
    m.active = true;
    m.x = range(next, 30, FIELD.width - 30);
    m.y = -20;
    m.vx = 0;
    m.vy = range(next, MOTH.fallMin, MOTH.fallMax) + this.phase * MOTH.fallPerPhase;
    m.flap = next() * Math.PI * 2;
    m.scale = range(next, 0.85, 1.2);
  }

  /** Fire the keeper's light pulse: banishes moths in reach, at a small cost of flame. */
  pulse() {
    if (this.pulseTimer > 0 || this.over) return 0;
    let events = EVENT_PULSE;
    this.pulseTimer = KEEPER.pulseCooldown;
    this.pulseAge = 0;
    this.flame = Math.max(1, this.flame - FLAME.pulseCost);
    for (const m of this.moths) {
      if (!m.active) continue;
      const dx = m.x - this.keeperX;
      const dy = m.y - KEEPER.lanternY;
      if (dx * dx + dy * dy <= KEEPER.pulseRadius * KEEPER.pulseRadius) {
        m.active = false;
        this.banished += 1;
        this.score += MOTH.points;
        this.burst(m.x, m.y, 'wisp', 10, 130, 0.55, 2.6);
        this.addFloater(m.x, m.y - 14, `+${MOTH.points}`, '#c9b8ff');
        events |= EVENT_BANISH;
      }
    }
    return events;
  }

  /**
   * Advance one fixed step. `move` is -1, 0 or 1 (or a fractional steer); `wantPulse`
   * fires the light pulse when its cooldown allows. Returns the event bitmask.
   */
  step(move, wantPulse) {
    if (this.over) return 0;
    let events = 0;
    const next = this.random;
    this.time += STEP;

    // The keeper glides toward the steered direction.
    const steer = clamp(move, -1, 1);
    this.keeperX = clamp(this.keeperX + steer * KEEPER.speed * STEP, 44, FIELD.width - 44);
    this.keeperLean = lerp(this.keeperLean, steer, 0.18);

    if (wantPulse) events |= this.pulse();
    if (this.pulseTimer > 0) this.pulseTimer -= STEP;
    this.pulseAge += STEP;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - STEP * 2.4);

    // The night deepens, phase by phase, until the dawn.
    this.phaseTime += STEP;
    if (this.phaseTime >= NIGHT.phaseSeconds) {
      this.phaseTime = 0;
      this.phase += 1;
      if (this.phase >= NIGHT.phases) {
        this.over = true;
        this.won = true;
        return events | EVENT_OVER;
      }
      events |= EVENT_PHASE;
      this.burst(FLAME.x, FLAME.baseY - 60, 'spark', 22, 170, 0.9, 2.4);
    }

    // Wind: calm spells broken by announced gusts.
    this.windTimer -= STEP;
    if (this.windTimer <= 0) {
      if (this.windState === 'calm') {
        this.windState = 'gust';
        this.windTarget = (next() < 0.5 ? -1 : 1) * WIND.strength * range(next, 0.7, 1.15);
        this.windTimer = WIND.gustSeconds;
      } else {
        this.windState = 'calm';
        this.windTarget = 0;
        this.windTimer = range(next, WIND.calmMin, WIND.calmMax);
      }
    }
    this.wind = lerp(this.wind, this.windTarget, 0.03);

    // Spawning, faster and thicker as the night deepens.
    this.emberTimer -= STEP;
    if (this.emberTimer <= 0) {
      this.spawnEmber();
      this.emberTimer = Math.max(0.34, EMBER.interval - this.phase * EMBER.intervalPerPhase) * range(next, 0.75, 1.25);
    }
    this.mothTimer -= STEP;
    if (this.mothTimer <= 0) {
      this.spawnMoth();
      this.mothTimer = Math.max(0.95, MOTH.interval - this.phase * MOTH.intervalPerPhase) * range(next, 0.75, 1.3);
    }

    // The flame always burns down; only caught embers feed it.
    this.flame -= FLAME.decayPerSecond * STEP;
    if (this.flame <= 0) {
      this.flame = 0;
      this.over = true;
      this.won = false;
      return events | EVENT_OVER;
    }

    events = this.stepEmbers(events);
    events |= this.stepMoths();
    this.stepParticles();
    return events;
  }

  stepEmbers(events) {
    const lanternX = this.keeperX;
    const lanternY = KEEPER.lanternY;
    for (const e of this.embers) {
      if (!e.active) continue;
      e.swayPhase += e.swaySpeed * STEP;
      e.x += (Math.sin(e.swayPhase) * EMBER.sway * 0.6 + this.wind) * STEP;
      e.y += e.vy * STEP;
      const dx = e.x - lanternX;
      const dy = e.y - lanternY;
      if (dx * dx + dy * dy <= KEEPER.catchRadius * KEEPER.catchRadius) {
        e.active = false;
        this.caught += 1;
        this.flame = Math.min(FLAME.max, this.flame + FLAME.emberFeed);
        const gained = EMBER.points * tierFor(this.flame).multiplier;
        this.score += gained;
        this.burst(e.x, e.y, 'spark', 12, 150, 0.6, 2.6);
        this.addFloater(e.x, e.y - 16, `+${gained}`, '#ffd98a');
        events |= EVENT_CATCH;
      } else if (e.y > FIELD.ridgeY + 24) {
        e.active = false;
        this.burst(e.x, FIELD.ridgeY, 'ash', 5, 60, 0.5, 2);
      }
    }
    return events;
  }

  stepMoths() {
    let events = 0;
    for (const m of this.moths) {
      if (!m.active) continue;
      m.flap += STEP * 14;
      const pull = clamp((FLAME.x - m.x) * 0.4, -MOTH.homePull, MOTH.homePull);
      m.vx = lerp(m.vx, pull + this.wind * 0.4, 0.02);
      m.x += m.vx * STEP + Math.sin(m.flap * 0.5) * 12 * STEP;
      m.y += m.vy * STEP;
      const dx = m.x - FLAME.x;
      const dy = m.y - (FLAME.baseY - 46);
      if (dx * dx + dy * dy < 56 * 56) {
        m.active = false;
        this.flame -= FLAME.mothBite;
        this.shake = 1;
        this.burst(m.x, m.y, 'smoke', 14, 90, 0.8, 3.4);
        this.addFloater(FLAME.x, FLAME.baseY - 130, `-${FLAME.mothBite} LIGHT`, '#ff8fa8');
        events |= EVENT_BITE;
        if (this.flame <= 0) {
          this.flame = 0;
          this.over = true;
          this.won = false;
          events |= EVENT_OVER;
        }
      } else if (m.y > FIELD.height + 30) {
        m.active = false;
      }
    }
    return events;
  }

  stepParticles() {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= STEP;
      if (p.life <= 0) {
        if (p.kind === 'mote') {
          // Ambient motes recycle forever: fade out at the top, drift back in below.
          p.y = FIELD.ridgeY + 10;
          p.x = this.random() * FIELD.width;
          p.maxLife = p.life = range(this.random, 6, 14);
        } else {
          p.active = false;
        }
        continue;
      }
      p.x += p.vx * STEP;
      p.y += p.vy * STEP;
      if (p.kind === 'spark') p.vy -= 60 * STEP;
      if (p.kind === 'smoke') { p.vy -= 24 * STEP; p.vx *= 0.98; }
    }
    for (const f of this.floaters) {
      if (!f.active) continue;
      f.life -= STEP;
      f.y -= 34 * STEP;
      if (f.life <= 0) f.active = false;
    }
    // The flame breathes out sparks of its own, faster the bigger it burns.
    if (this.random() < 0.25 + this.flame * 0.006) {
      this.spawnParticle('spark', FLAME.x + range(this.random, -16, 16), FLAME.baseY - 30, {
        vx: range(this.random, -14, 14) + this.wind * 0.2,
        vy: range(this.random, -120, -60),
        life: range(this.random, 0.5, 1.1),
        size: range(this.random, 1.2, 2.6),
      });
    }
  }

  /** Seconds until dawn, for the HUD's moon arc. */
  get dawnProgress() {
    return clamp((this.phase * NIGHT.phaseSeconds + this.phaseTime) / (NIGHT.phases * NIGHT.phaseSeconds), 0, 1);
  }

  get tier() {
    return tierFor(this.flame);
  }
}
