// All of EMBERFALL's drawing: the twilight valley, the Great Flame, the keeper, the
// falling embers and moths, the HUD and the title and ending screens. The scenery
// (stars, ridge lines) is generated once from a fixed seed, and every flicker is a
// function of the world's own clock, so a staged frame always draws identically.

import { FIELD, FLAME, FONT, KEEPER, PALETTE } from './config.js';
import { SCREEN_DAWN, SCREEN_DARK, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { clamp, makeRandom } from './random.js';

const TAU = Math.PI * 2;

let scenery = null;

/** Stars and the three ridge silhouettes, built once from a fixed seed. */
function buildScenery() {
  const next = makeRandom(20261115);
  const stars = [];
  for (let i = 0; i < 150; i += 1) {
    stars.push({ x: next() * FIELD.width, y: next() * 430, r: 0.6 + next() * 1.5, tw: next() * TAU });
  }
  const ridge = (baseY, amp, step) => {
    const points = [];
    let y = baseY;
    for (let x = 0; x <= FIELD.width + step; x += step) {
      y += (next() - 0.5) * amp;
      y = clamp(y, baseY - amp * 1.6, baseY + amp * 1.6);
      points.push({ x, y });
    }
    return points;
  };
  return {
    stars,
    far: ridge(430, 26, 90),
    mid: ridge(520, 34, 70),
    near: ridge(FIELD.ridgeY - 6, 16, 56),
  };
}

function ridgePath(ctx, points, baseY) {
  ctx.beginPath();
  ctx.moveTo(-4, FIELD.height + 4);
  ctx.lineTo(-4, points[0].y);
  for (const p of points) ctx.lineTo(p.x, p.y);
  ctx.lineTo(FIELD.width + 4, FIELD.height + 4);
  ctx.closePath();
  ctx.fill();
  void baseY;
}

function drawSky(ctx, world) {
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.45, PALETTE.skyMid);
  sky.addColorStop(0.78, PALETTE.skyLow);
  sky.addColorStop(1, PALETTE.horizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  for (const star of scenery.stars) {
    const glow = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(world.time * 1.7 + star.tw));
    ctx.globalAlpha = glow * 0.9;
    ctx.fillStyle = '#dfe6ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The moon rides an arc across the sky as the night wears on: dawn is coming.
  const t = world.dawnProgress;
  const moonX = 120 + t * (FIELD.width - 240);
  const moonY = 300 - Math.sin(t * Math.PI) * 190;
  const halo = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 90);
  halo.addColorStop(0, 'rgba(230,236,255,0.5)');
  halo.addColorStop(1, 'rgba(230,236,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(moonX - 90, moonY - 90, 180, 180);
  ctx.fillStyle = '#e9edff';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 26, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,170,220,0.35)';
  ctx.beginPath();
  ctx.arc(moonX - 8, moonY - 5, 5, 0, TAU);
  ctx.arc(moonX + 9, moonY + 8, 4, 0, TAU);
  ctx.arc(moonX + 4, moonY - 12, 3, 0, TAU);
  ctx.fill();
}

function drawValley(ctx) {
  ctx.fillStyle = PALETTE.ridgeFar;
  ridgePath(ctx, scenery.far);
  ctx.fillStyle = PALETTE.ridgeMid;
  ridgePath(ctx, scenery.mid);
  ctx.fillStyle = PALETTE.ridgeNear;
  ridgePath(ctx, scenery.near);
  ctx.fillStyle = PALETTE.ridgeNear;
  ctx.fillRect(0, FIELD.ridgeY + 10, FIELD.width, FIELD.height - FIELD.ridgeY);
}

function drawBrazier(ctx) {
  const x = FLAME.x;
  const y = FLAME.baseY;
  ctx.fillStyle = PALETTE.stoneDark;
  ctx.beginPath();
  ctx.moveTo(x - 58, y + 58);
  ctx.lineTo(x - 40, y + 6);
  ctx.lineTo(x + 40, y + 6);
  ctx.lineTo(x + 58, y + 58);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.stone;
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 56, 13, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0f0c22';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 44, 9, 0, 0, TAU);
  ctx.fill();
}

/** One teardrop flame tongue, swaying with the world's clock. */
function flameTongue(ctx, x, baseY, width, height, sway, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x - width, baseY);
  ctx.bezierCurveTo(x - width, baseY - height * 0.45, x - width * 0.25 + sway, baseY - height * 0.72, x + sway, baseY - height);
  ctx.bezierCurveTo(x + width * 0.25 + sway, baseY - height * 0.72, x + width, baseY - height * 0.45, x + width, baseY);
  ctx.closePath();
  ctx.fill();
}

function drawFlame(ctx, world) {
  const x = FLAME.x;
  const y = FLAME.baseY - 2;
  if (world.flame <= 0) {
    // Dead: a smouldering bed of embers and one last wisp of smoke, no tongues.
    ctx.fillStyle = 'rgba(255,90,40,0.16)';
    ctx.beginPath();
    ctx.ellipse(x, y, 40, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff7b2f';
    for (const dx of [-22, -7, 11, 24]) {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(world.time * 2 + dx);
      ctx.beginPath();
      ctx.arc(x + dx, y - 1, 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }
  const size = Math.max(world.flame, 2);
  const height = 34 + size * 1.62;
  const width = 15 + size * 0.34;
  const flick = Math.sin(world.time * 9.3) * 3 + Math.sin(world.time * 23.7) * 1.6;

  // The light the flame throws on the valley floor.
  const pool = ctx.createRadialGradient(x, y, 10, x, y, 130 + size * 2.6);
  pool.addColorStop(0, 'rgba(255,150,60,0.34)');
  pool.addColorStop(1, 'rgba(255,110,40,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(x - 420, y - 320, 840, 420);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x, y - height * 0.4, 6, x, y - height * 0.4, height * 1.25);
  glow.addColorStop(0, 'rgba(255,170,70,0.5)');
  glow.addColorStop(1, 'rgba(255,110,40,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - height * 1.4, y - height * 1.6, height * 2.8, height * 2.2);
  flameTongue(ctx, x, y, width * 1.25, height * 0.92, flick * 1.5, 'rgba(232,62,29,0.75)');
  flameTongue(ctx, x, y, width, height, flick, PALETTE.flameOuter);
  flameTongue(ctx, x, y, width * 0.66, height * 0.72, flick * 0.7, PALETTE.flameMid);
  flameTongue(ctx, x, y, width * 0.36, height * 0.46, flick * 0.4, PALETTE.flameCore);
  ctx.restore();
}

function drawEmber(ctx, e, time) {
  const pulse = 1 + 0.16 * Math.sin(time * 6 + e.swayPhase * 3);
  const r = 7.5 * e.size * pulse;
  const glow = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, r * 3.4);
  glow.addColorStop(0, 'rgba(255,190,90,0.85)');
  glow.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(e.x - r * 3.4, e.y - r * 3.4, r * 6.8, r * 6.8);
  ctx.fillStyle = PALETTE.ember;
  ctx.beginPath();
  ctx.arc(e.x, e.y, r * 0.62, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.emberCore;
  ctx.beginPath();
  ctx.arc(e.x, e.y, r * 0.3, 0, TAU);
  ctx.fill();
}

function drawMoth(ctx, m) {
  const wing = Math.sin(m.flap) * 0.55;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(m.scale, m.scale);
  ctx.fillStyle = PALETTE.mothWing;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(side * (0.5 + wing * 0.5));
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(side * 13, -3, 14, 6.5, side * 0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.moth;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8.5, 11, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.mothEye;
  ctx.beginPath();
  ctx.arc(-3, -5, 1.7, 0, TAU);
  ctx.arc(3, -5, 1.7, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawKeeper(ctx, world) {
  const x = world.keeperX;
  const ground = FIELD.ridgeY + 8;
  const lean = world.keeperLean * 7;

  // The lantern's warm pool of light.
  const lampX = x + 24 + lean;
  const lampY = KEEPER.lanternY + 26;
  const lampGlow = ctx.createRadialGradient(lampX, lampY, 4, lampX, lampY, 105);
  lampGlow.addColorStop(0, 'rgba(255,190,100,0.4)');
  lampGlow.addColorStop(1, 'rgba(255,160,70,0)');
  ctx.fillStyle = lampGlow;
  ctx.fillRect(lampX - 105, lampY - 105, 210, 210);

  // Cloak.
  ctx.fillStyle = '#1d2b52';
  ctx.beginPath();
  ctx.moveTo(x - 21, ground);
  ctx.bezierCurveTo(x - 19, ground - 52, x - 11 + lean, ground - 78, x + lean, ground - 84);
  ctx.bezierCurveTo(x + 11 + lean, ground - 78, x + 19, ground - 52, x + 21, ground);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.teal;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 21, ground - 2);
  ctx.lineTo(x + 21, ground - 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Hood and face.
  ctx.fillStyle = '#16224a';
  ctx.beginPath();
  ctx.arc(x + lean, ground - 88, 13.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0a0f26';
  ctx.beginPath();
  ctx.arc(x + lean, ground - 86, 9, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.arc(x + lean - 3, ground - 86, 1.5, 0, TAU);
  ctx.arc(x + lean + 3, ground - 86, 1.5, 0, TAU);
  ctx.fill();

  // Staff and lantern.
  ctx.strokeStyle = '#4a3626';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 12 + lean, ground - 30);
  ctx.lineTo(lampX, lampY - 14);
  ctx.stroke();
  ctx.fillStyle = '#0f0c22';
  ctx.fillRect(lampX - 6, lampY - 8, 12, 16);
  ctx.fillStyle = PALETTE.emberCore;
  ctx.beginPath();
  ctx.arc(lampX, lampY, 4.2 + Math.sin(world.time * 11) * 0.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#c9973f';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(lampX - 6, lampY - 8, 12, 16);
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    if (!p.active) continue;
    const fade = clamp(p.life / p.maxLife, 0, 1);
    if (p.kind === 'mote') {
      ctx.globalAlpha = 0.35 * fade;
      ctx.fillStyle = '#ffca7a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    } else if (p.kind === 'spark') {
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.hue > 0.5 ? PALETTE.ember : PALETTE.emberCore;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * fade + 0.4, 0, TAU);
      ctx.fill();
    } else if (p.kind === 'ash') {
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillStyle = '#8d86a3';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    } else if (p.kind === 'wisp') {
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = '#b7a6ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * fade + 0.5, 0, TAU);
      ctx.fill();
    } else if (p.kind === 'smoke') {
      ctx.globalAlpha = 0.32 * fade;
      ctx.fillStyle = '#5d5470';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - fade * 0.6), 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawPulse(ctx, world) {
  if (world.pulseAge > 0.45) return;
  const t = world.pulseAge / 0.45;
  ctx.globalAlpha = (1 - t) * 0.8;
  ctx.strokeStyle = '#ffe9b0';
  ctx.lineWidth = 3.5 * (1 - t) + 0.5;
  ctx.beginPath();
  ctx.arc(world.keeperX, KEEPER.lanternY, 20 + t * KEEPER.pulseRadius, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.textAlign = 'center';
  ctx.font = `700 19px ${FONT}`;
  for (const f of world.floaters) {
    if (!f.active) continue;
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.fillStyle = f.colour;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawWind(ctx, world) {
  if (Math.abs(world.wind) < 34) return;
  const dir = Math.sign(world.wind);
  ctx.strokeStyle = 'rgba(190,200,255,0.4)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i += 1) {
    const y = 90 + i * 74;
    const drift = (world.time * 260 * dir + i * 173) % (FIELD.width + 240);
    const x = dir > 0 ? drift - 120 : FIELD.width + 120 - drift;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 64 * dir, y);
    ctx.stroke();
  }
  ctx.font = `700 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cdd7ff';
  ctx.fillText(dir > 0 ? 'THE WIND RISES ≫' : '≪ THE WIND RISES', FIELD.width / 2, 118);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,8,32,0.72)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,179,71,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawHud(ctx, world, best) {
  ctx.textBaseline = 'alphabetic';
  // Score, top left.
  ctx.textAlign = 'left';
  ctx.font = `700 15px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('SCORE', 28, 40);
  ctx.font = `800 34px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(String(world.score).padStart(6, '0'), 28, 76);
  ctx.font = `600 15px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`BEST ${String(Math.max(best, world.score)).padStart(6, '0')}`, 28, 100);

  // The night's progress, top centre: phase name and the road to dawn.
  ctx.textAlign = 'center';
  ctx.font = `800 21px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(world.over ? (world.won ? 'DAWN' : 'DARKNESS') : `NIGHT — ${['DUSK', 'FIRST DARK', 'DEEP NIGHT', 'THE HOWLING', 'LAST WATCH'][world.phase]}`, FIELD.width / 2, 44);
  ctx.fillStyle = 'rgba(245,234,210,0.18)';
  ctx.beginPath();
  ctx.roundRect(FIELD.width / 2 - 170, 56, 340, 9, 5);
  ctx.fill();
  ctx.fillStyle = PALETTE.teal;
  ctx.beginPath();
  ctx.roundRect(FIELD.width / 2 - 170, 56, 340 * world.dawnProgress, 9, 5);
  ctx.fill();
  ctx.fillStyle = '#e9edff';
  ctx.beginPath();
  ctx.arc(FIELD.width / 2 - 170 + 340 * world.dawnProgress, 60.5, 6, 0, TAU);
  ctx.fill();

  // The flame meter, top right.
  const meterX = FIELD.width - 268;
  ctx.textAlign = 'left';
  ctx.font = `700 15px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('THE GREAT FLAME', meterX, 40);
  ctx.fillStyle = 'rgba(245,234,210,0.16)';
  ctx.beginPath();
  ctx.roundRect(meterX, 50, 240, 20, 10);
  ctx.fill();
  const flameGrad = ctx.createLinearGradient(meterX, 0, meterX + 240, 0);
  flameGrad.addColorStop(0, PALETTE.flameTip);
  flameGrad.addColorStop(0.55, PALETTE.flameOuter);
  flameGrad.addColorStop(1, PALETTE.ember);
  ctx.fillStyle = world.flame < 20 && Math.sin(world.time * 10) > 0 ? PALETTE.danger : flameGrad;
  ctx.beginPath();
  ctx.roundRect(meterX, 50, Math.max(10, 240 * (world.flame / 100)), 20, 10);
  ctx.fill();
  ctx.font = `700 16px ${FONT}`;
  ctx.fillStyle = world.flame < 20 ? PALETTE.danger : PALETTE.ember;
  const tier = world.tier;
  ctx.fillText(world.flame < 20 ? 'THE FLAME GUTTERS!' : `${tier.name} — CATCHES ×${tier.multiplier}`, meterX, 94);

  // Tallies, bottom right; controls, bottom left.
  ctx.textAlign = 'right';
  ctx.font = `600 16px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`Embers caught ${world.caught} · Moths banished ${world.banished}`, FIELD.width - 28, FIELD.height - 20);
  ctx.textAlign = 'left';
  ctx.fillText('Move: mouse or ← → · Light pulse: click or Space · Pause: P · Mute: M', 28, FIELD.height - 20);
}

function drawTitle(ctx, world, best) {
  const shade = ctx.createLinearGradient(0, 120, 0, FIELD.height);
  shade.addColorStop(0, 'rgba(5,4,20,0)');
  shade.addColorStop(0.55, 'rgba(5,4,20,0.55)');
  shade.addColorStop(1, 'rgba(5,4,20,0.82)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  ctx.textAlign = 'center';
  ctx.save();
  ctx.shadowColor = 'rgba(255,130,40,0.9)';
  ctx.shadowBlur = 42;
  ctx.font = `900 104px ${FONT}`;
  ctx.fillStyle = '#ffb347';
  ctx.fillText('EMBERFALL', FIELD.width / 2, 218);
  ctx.restore();
  ctx.font = `700 25px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('K E E P E R   O F   T H E   L A S T   L I G H T', FIELD.width / 2, 262);

  ctx.font = `400 21px ${FONT}`;
  ctx.fillStyle = '#ddd2f2';
  ctx.fillText('All night, embers rain on the valley. Catch them in your lantern and feed the Great Flame.', FIELD.width / 2, 330);
  ctx.fillText('Shadow moths come to drink its light — banish them with a pulse, and keep the flame alive until dawn.', FIELD.width / 2, 360);

  ctx.font = `600 19px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Move — mouse or arrow keys      Light pulse — click or Space      Survive 5 phases to reach dawn', FIELD.width / 2, 416);

  // The prompt breathes rather than blinks, so it is visible in any still frame.
  ctx.globalAlpha = 0.62 + 0.38 * Math.sin(world.time * 3.2);
  ctx.font = `800 27px ${FONT}`;
  ctx.fillStyle = PALETTE.emberCore;
  ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', FIELD.width / 2, 486);
  ctx.globalAlpha = 1;
  if (best > 0) {
    ctx.font = `600 17px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`Best score so far: ${best}`, FIELD.width / 2, 524);
  }
}

function drawEnd(ctx, world, best) {
  ctx.fillStyle = world.won ? 'rgba(24,14,4,0.45)' : 'rgba(4,3,14,0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, FIELD.width / 2 - 300, 148, 600, 400);

  ctx.textAlign = 'center';
  // Shrink the headline to fit the panel, whichever ending it names.
  const headline = world.won ? 'DAWN BREAKS' : 'THE LIGHT WENT OUT';
  let headSize = 58;
  ctx.font = `900 ${headSize}px ${FONT}`;
  while (ctx.measureText(headline).width > 540 && headSize > 30) {
    headSize -= 2;
    ctx.font = `900 ${headSize}px ${FONT}`;
  }
  if (world.won) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,170,60,0.85)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffcf7d';
    ctx.fillText(headline, FIELD.width / 2, 238);
    ctx.restore();
    ctx.font = `400 20px ${FONT}`;
    ctx.fillStyle = '#e8dcff';
    ctx.fillText('The valley wakes in your light, Keeper.', FIELD.width / 2, 276);
  } else {
    ctx.fillStyle = '#8f86b8';
    ctx.fillText(headline, FIELD.width / 2, 238);
    ctx.font = `400 20px ${FONT}`;
    ctx.fillStyle = '#b6abd9';
    ctx.fillText('The moths inherit the valley — this time.', FIELD.width / 2, 276);
  }

  ctx.font = `700 22px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  const rows = [
    ['SCORE', String(world.score)],
    ['EMBERS CAUGHT', String(world.caught)],
    ['MOTHS BANISHED', String(world.banished)],
    ['BEST', String(Math.max(best, world.score))],
  ];
  rows.forEach(([label, value], i) => {
    const y = 336 + i * 40;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(label, FIELD.width / 2 - 24, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(value, FIELD.width / 2 + 24, y);
  });

  ctx.globalAlpha = 0.62 + 0.38 * Math.sin(world.time * 3.2);
  ctx.textAlign = 'center';
  ctx.font = `800 24px ${FONT}`;
  ctx.fillStyle = PALETTE.emberCore;
  ctx.fillText('CLICK OR PRESS R TO PLAY AGAIN', FIELD.width / 2, 516);
  ctx.globalAlpha = 1;
}

/** Draw one whole frame: the valley, the play, then the screen that sits over it. */
export function renderFrame(ctx, world, screen, best) {
  if (!scenery) scenery = buildScenery();
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake * 7;
    ctx.translate(Math.sin(world.time * 91) * s, Math.cos(world.time * 83) * s * 0.6);
  }
  drawSky(ctx, world);
  drawValley(ctx);
  drawWind(ctx, world);
  drawBrazier(ctx);
  drawFlame(ctx, world);
  for (const e of world.embers) if (e.active) drawEmber(ctx, e, world.time);
  for (const m of world.moths) if (m.active) drawMoth(ctx, m);
  drawParticles(ctx, world);
  drawKeeper(ctx, world);
  drawPulse(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();

  if (screen === SCREEN_PLAY || screen === SCREEN_DAWN || screen === SCREEN_DARK) drawHud(ctx, world, best);
  if (screen === SCREEN_TITLE) drawTitle(ctx, world, best);
  if (screen === SCREEN_DAWN) drawEnd(ctx, world, best);
  if (screen === SCREEN_DARK) drawEnd(ctx, world, best);
}
