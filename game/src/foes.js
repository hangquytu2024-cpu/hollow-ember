// The creatures of the hollow: husks that patrol ledges, archers that aim, bats that swoop, and the Warden boss.
import { FOES, GROUND_Y, W } from './config.js';

export function createFoe(kind, pos, platform, hpScale, rng) {
  const def = FOES[kind];
  const hp = Math.round(def.hp * hpScale);
  return {
    kind, x: pos.x, y: pos.y, w: def.w, h: def.h, hp, maxHp: hp, platform, dir: rng.next() < 0.5 ? -1 : 1, face: 1,
    stagger: 0, flash: 0, t: rng.range(0.6, 1.6), mode: 'idle', vx: 0, vy: 0, sw: 0, phase: rng.range(0, 6.28), n: 0, aim: false,
  };
}

/** Damage this foe deals on touch right now. The Warden's charge hits twice as hard. */
export const touchDamage = (f) => (f.kind === 'warden' && f.mode === 'charge' ? 2 : FOES[f.kind].touch);

const hostile = (g, x, y, vx, vy, kind, size, life) => g.shots.push({ x, y, vx, vy, w: size.w, h: size.h, dmg: 1, hostile: true, kind, life });

/** Advance one foe by `dt`. Foes read the hero from the game and push arrows and waves into game.shots. */
export function updateFoe(f, g, dt) {
  f.flash = Math.max(0, f.flash - dt);
  if (f.stagger > 0) {
    f.stagger -= dt;
    return;
  }
  const p = g.player;
  const px = p.x + p.w / 2;
  const cx = f.x + f.w / 2;
  f.face = px >= cx ? 1 : -1;
  if (f.kind === 'husk') updateHusk(f, p, px, cx, dt);
  else if (f.kind === 'archer') updateArcher(f, g, p, dt);
  else if (f.kind === 'bat') updateBat(f, g, p, px, dt);
  else updateWarden(f, g, p, dt);
}

function updateHusk(f, p, px, cx, dt) {
  const pl = f.platform;
  const sameLedge = Math.abs(p.y + p.h - pl.y) < 50 && px > pl.x - 20 && px < pl.x + pl.w + 20;
  const chase = sameLedge && Math.abs(px - cx) < 320;
  if (chase) f.dir = px > cx ? 1 : -1;
  f.x += f.dir * FOES.husk.speed * (chase ? 1.6 : 1) * dt;
  if (f.x < pl.x) { f.x = pl.x; f.dir = 1; }
  if (f.x + f.w > pl.x + pl.w) { f.x = pl.x + pl.w - f.w; f.dir = -1; }
}

function updateArcher(f, g, p, dt) {
  f.t -= dt;
  f.aim = f.t < 0.5;
  if (f.t > 0) return;
  f.t = FOES.archer.fireEvery + g.rng.range(0, 0.7);
  const dx = p.x + p.w / 2 - (f.x + f.w / 2);
  const dy = p.y + p.h / 2 - (f.y + 10);
  const len = Math.hypot(dx, dy) || 1;
  hostile(g, f.x + f.w / 2 - 7, f.y + 8, (dx / len) * 250, (dy / len) * 250, 'arrow', { w: 14, h: 6 }, 3);
  g.events.push('arrow');
}

function updateBat(f, g, p, px, dt) {
  f.t -= dt;
  if (f.mode === 'swoop') {
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.sw -= dt;
    if (f.sw <= 0) f.mode = 'idle';
  } else {
    const tx = px + Math.sin(g.time * 1.7 + f.phase) * 120 - f.w / 2;
    const ty = p.y - 110 + Math.sin(g.time * 3 + f.phase) * 18;
    const dx = tx - f.x;
    const dy = ty - f.y;
    const len = Math.hypot(dx, dy) || 1;
    const step = Math.min(len, FOES.bat.speed * dt);
    f.x += (dx / len) * step;
    f.y += (dy / len) * step;
    if (f.t <= 0) {
      const sx = px - (f.x + f.w / 2);
      const sy = p.y + p.h / 2 - (f.y + f.h / 2);
      const sl = Math.hypot(sx, sy) || 1;
      f.mode = 'swoop';
      f.vx = (sx / sl) * 330;
      f.vy = (sy / sl) * 330;
      f.sw = 0.6;
      f.t = FOES.bat.swoopEvery + g.rng.range(0, 0.9);
      g.events.push('screech');
    }
  }
  f.x = Math.max(0, Math.min(W - f.w, f.x));
  f.y = Math.max(40, Math.min(GROUND_Y - f.h, f.y));
}

function updateWarden(f, g, p, dt) {
  const rage = f.hp < f.maxHp * 0.5 ? 1.35 : 1;
  const ground = GROUND_Y - f.h;
  f.t -= dt * rage;
  if (f.mode === 'idle') {
    if (f.t > 0) return;
    const move = ['chargeTele', 'jump', 'orbsTele'][f.n++ % 3];
    f.mode = move;
    f.t = move === 'jump' ? 0.5 : move === 'orbsTele' ? 0.7 : 0.75;
    g.events.push('warden');
  } else if (f.mode === 'chargeTele') {
    if (f.t <= 0) { f.mode = 'charge'; f.t = 0.95; f.vx = f.face * 430 * rage; }
  } else if (f.mode === 'charge') {
    f.x += f.vx * dt;
    if (f.x < 0 || f.x > W - f.w) { f.x = Math.max(0, Math.min(W - f.w, f.x)); f.vx = 0; }
    if (f.t <= 0) { f.mode = 'idle'; f.t = 1.0; }
  } else if (f.mode === 'jump') {
    if (f.t <= 0) { f.mode = 'air'; f.vy = -760; f.vx = f.face * 120; }
  } else if (f.mode === 'air') {
    f.vy += 1900 * dt;
    f.x = Math.max(0, Math.min(W - f.w, f.x + f.vx * dt));
    f.y += f.vy * dt;
    if (f.y >= ground) {
      f.y = ground;
      f.mode = 'idle';
      f.t = 1.1;
      hostile(g, f.x + f.w, GROUND_Y - 26, 320, 0, 'wave', { w: 34, h: 26 }, 2.4);
      hostile(g, f.x - 34, GROUND_Y - 26, -320, 0, 'wave', { w: 34, h: 26 }, 2.4);
      g.shake = Math.max(g.shake, 0.5);
      g.events.push('slam');
    }
  } else if (f.mode === 'orbsTele') {
    if (f.t <= 0) {
      const cx = f.x + f.w / 2;
      const cy = f.y + 20;
      const base = Math.atan2(p.y + p.h / 2 - cy, p.x + p.w / 2 - cx);
      for (const off of [-0.3, 0, 0.3]) hostile(g, cx - 8, cy - 8, Math.cos(base + off) * 235, Math.sin(base + off) * 235, 'orb', { w: 16, h: 16 }, 4);
      f.mode = 'idle';
      f.t = 1.0;
      g.events.push('orb');
    }
  }
}
