// The rules: one descent through five chambers. This file owns the state machine (title, playing, upgrade,
// dead, victory) and every interaction between hero, foes, shots and pickups. It touches no browser API,
// so the same code runs in the page and in the node smoke test.
import { CARDS, FOES, GROUND_Y, H, PLAYER, ROOMS, UPGRADES, W } from './config.js';
import { buildRoom, spawnPoint } from './level.js';
import { makeRng } from './rng.js';
import { createFoe, touchDamage, updateFoe } from './foes.js';
import { createPlayer, maxHp, movePlayer, swingBox, swingDamage } from './player.js';

export const DOOR = { x: W - 74, y: GROUND_Y - 96, w: 54, h: 96 };
const SPAWN_DELAY = 0.8;

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function createGame(seed = 1) {
  return {
    seed, rng: makeRng(seed), state: 'title', time: 0, best: 0, events: [], parts: [], pops: [], rings: [], cam: null, shake: 0, freeze: 0, endT: 0, runs: 0,
    roomIndex: 0, room: null, player: createPlayer(), foes: [], shots: [], pickups: [], offers: [], taken: [], score: 0, kills: 0,
    roomTime: 0, runTime: 0, doorOpen: false, victoryT: 0,
  };
}

export function startRun(g, seed = g.seed + g.runs) {
  g.rng = makeRng(seed);
  g.runs += 1;
  g.player = createPlayer();
  g.score = 0;
  g.kills = 0;
  g.taken = [];
  g.runTime = 0;
  g.victoryT = 0;
  g.parts.length = 0;
  g.pops.length = 0;
  g.rings.length = 0;
  g.cam = null;
  loadRoom(g, 0);
  g.state = 'playing';
  g.events.push('start');
}

/** Put the hero in chamber `index` (used by the screenshot scenes to reach the boss without a full descent). */
export function enterRoom(g, index) {
  loadRoom(g, index);
}

function loadRoom(g, index) {
  g.roomIndex = index;
  g.room = buildRoom(index, g.rng);
  const scale = g.room.boss ? 1 : 1 + 0.12 * index;
  g.foes = g.room.spawns.map((s, i) => createFoe(s.kind, spawnPoint(g.room, s, i), g.room.platforms[s.platform], scale, g.rng));
  g.shots = [];
  g.pickups = [];
  g.roomTime = 0;
  g.doorOpen = false;
  const p = g.player;
  p.x = 50; p.y = GROUND_Y - p.h; p.vx = 0; p.vy = 0; p.invuln = 1.0; p.dashT = 0; p.swingT = 0; p.onGround = true; p.jumps = p.stats.maxJumps;
}

/** Three different upgrades the hero does not own yet; when fewer remain, repeats are allowed. */
function drawOffers(g) {
  let pool = UPGRADES.filter((u) => !g.taken.includes(u.id));
  if (pool.length < 3) pool = UPGRADES.slice();
  const offers = [];
  while (offers.length < 3) offers.push(pool.splice(g.rng.int(0, pool.length - 1), 1)[0]);
  return offers;
}

function burst(g, x, y, color, n, speed, size = 3, grav = 500) {
  for (let i = 0; i < n && g.parts.length < 500; i++) {
    const a = g.rng.range(0, 6.283);
    const v = g.rng.range(speed * 0.3, speed);
    g.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.2, life: g.rng.range(0.3, 0.7), max: 0.7, color, size, grav });
  }
}

function hurtPlayer(g, dmg, fromX) {
  const p = g.player;
  if (p.invuln > 0 || g.state !== 'playing') return false;
  p.hp -= dmg;
  p.invuln = PLAYER.hitInvuln;
  p.vx = (p.x + p.w / 2 >= fromX ? 1 : -1) * 280;
  p.vy = -280;
  p.onGround = false;
  g.shake = 0.45;
  g.freeze = 0.09;
  g.events.push('hurt');
  burst(g, p.x + p.w / 2, p.y + p.h / 2, '#ff4d5e', 14, 260);
  if (p.hp <= 0) {
    g.state = 'dead';
    g.endT = 0;
    g.best = Math.max(g.best, g.score);
    g.events.push('die');
  }
  return true;
}

function killFoe(g, f) {
  g.foes.splice(g.foes.indexOf(f), 1);
  g.kills += 1;
  g.score += FOES[f.kind].score;
  burst(g, f.x + f.w / 2, f.y + f.h / 2, '#ffb15e', f.kind === 'warden' ? 60 : 18, f.kind === 'warden' ? 420 : 280, 4);
  ring(g, f.x + f.w / 2, f.y + f.h / 2, f.kind === 'warden' ? 150 : 74, '#ff9a4d');
  g.shake = Math.max(g.shake, f.kind === 'warden' ? 0.6 : 0.22);
  g.events.push('kill');
  const p = g.player;
  if (f.kind === 'warden') {
    g.victoryT = 1.6;
    g.shots = [];
    g.freeze = 0.2;
    return;
  }
  if (p.stats.leech && g.kills % 4 === 0) {
    p.hp = Math.min(maxHp(p), p.hp + 1);
    g.events.push('pickup');
    burst(g, p.x + p.w / 2, p.y, '#ff7a8a', 10, 160, 3, -60);
  } else if (g.rng.next() < 0.16) {
    g.pickups.push({ x: f.x + f.w / 2 - 7, y: f.y, vy: -120, kind: 'heart' });
  }
}

/** A ring that spreads and fades: the shock of a heavy hit or a kill. */
function ring(g, x, y, size, color) {
  g.rings.push({ x, y, r: 6, max: size, life: 0.28, total: 0.28, color });
}

/**
 * A blow lands on a foe. `dir` is the way the blow travels (-1 left, 1 right); `heavy` marks the third
 * hit of the combo. A guard blocks light blows from the front and has its shield broken by a heavy one.
 */
function damageFoe(g, f, dmg, dir, heavy = false) {
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  if (f.kind === 'guard' && f.broken <= 0) {
    if (f.face === -dir && !heavy) {
      f.flash = 0.08;
      f.hp -= dmg * 0.2;
      f.x = Math.max(f.platform.x, Math.min(f.platform.x + f.platform.w - f.w, f.x + dir * 6));
      burst(g, cx - f.face * 14, cy, '#9be8ff', 8, 240, 2);
      g.pops.push({ x: cx, y: f.y - 4, text: 'BLOCK', life: 0.6, big: false });
      g.events.push('clang');
      g.freeze = Math.max(g.freeze, 0.03);
      g.shake = Math.max(g.shake, 0.1);
      if (f.hp <= 0) killFoe(g, f);
      return;
    }
    if (f.face === -dir && heavy) {
      f.broken = 1.6;
      f.stagger = 0.7;
      g.pops.push({ x: cx, y: f.y - 22, text: 'GUARD BREAK', life: 0.9, big: true });
      g.events.push('break');
    }
  }
  f.hp -= dmg;
  f.flash = 0.12;
  g.score += 1;
  if (f.kind !== 'warden') {
    f.stagger = Math.max(f.stagger, heavy ? 0.4 : 0.22);
    if (f.kind === 'bat') { f.mode = 'idle'; f.t = Math.max(f.t, 0.8); f.x = Math.max(0, f.x + dir * (heavy ? 44 : 26)); }
    else f.x = Math.max(f.platform.x, Math.min(f.platform.x + f.platform.w - f.w, f.x + dir * (heavy ? 30 : 18)));
    if (f.kind === 'charger' && f.mode !== 'dazed') { f.mode = 'dazed'; f.t = 0.7; }
  }
  burst(g, cx, cy, '#ffe2a8', heavy ? 16 : 9, heavy ? 340 : 240, heavy ? 4 : 3);
  if (heavy) ring(g, cx, cy, 52, '#ffd36b');
  g.pops.push({ x: cx, y: f.y - 4, text: String(Math.round(dmg)), life: 0.7, big: dmg >= 16 });
  g.events.push(heavy ? 'smash' : 'hit');
  g.freeze = Math.max(g.freeze, f.hp <= 0 ? 0.1 : heavy ? 0.085 : 0.05);
  g.shake = Math.max(g.shake, heavy ? 0.3 : 0.12);
  if (f.hp <= 0) killFoe(g, f);
}

function updateShots(g, dt) {
  const p = g.player;
  for (let i = g.shots.length - 1; i >= 0; i--) {
    const s = g.shots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    let gone = s.life <= 0 || s.x < -40 || s.x > W + 40 || s.y < -40 || s.y > H + 40;
    if (!gone && s.hostile && overlap(s, p) && hurtPlayer(g, s.dmg, s.x)) gone = true;
    if (!gone && !s.hostile) {
      for (const f of g.foes) {
        if (overlap(s, f)) { damageFoe(g, f, s.dmg, Math.sign(s.vx)); gone = true; break; }
      }
    }
    if (gone) g.shots.splice(i, 1);
  }
}

function updatePickups(g, dt) {
  const p = g.player;
  for (let i = g.pickups.length - 1; i >= 0; i--) {
    const k = g.pickups[i];
    k.vy += 600 * dt;
    k.y = Math.min(GROUND_Y - 16, k.y + k.vy * dt);
    if (overlap({ x: k.x, y: k.y, w: 16, h: 16 }, p)) {
      p.hp = Math.min(maxHp(p), p.hp + 1);
      g.pickups.splice(i, 1);
      g.events.push('pickup');
      burst(g, k.x + 8, k.y, '#ff7a8a', 10, 160, 3, -60);
    }
  }
}

function updateParts(g, dt) {
  for (let i = g.rings.length - 1; i >= 0; i--) {
    const q = g.rings[i];
    q.life -= dt;
    q.r = 6 + (q.max - 6) * (1 - q.life / q.total);
    if (q.life <= 0) g.rings.splice(i, 1);
  }
  for (let i = g.pops.length - 1; i >= 0; i--) {
    const q = g.pops[i];
    q.life -= dt;
    q.y -= 46 * dt;
    if (q.life <= 0) g.pops.splice(i, 1);
  }
  for (let i = g.parts.length - 1; i >= 0; i--) {
    const q = g.parts[i];
    q.life -= dt;
    q.vy += q.grav * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    if (q.life <= 0) g.parts.splice(i, 1);
  }
}

function swordPhase(g) {
  const p = g.player;
  if (p.justSwung && p.stats.sparks) {
    g.shots.push({ x: p.x + p.w / 2, y: p.y + 10, vx: p.face * 460, vy: 0, w: 16, h: 10, dmg: 6 * p.stats.damage, life: 0.9, kind: 'spark' });
  }
  const box = swingBox(p);
  if (!box) return;
  for (const f of g.foes.slice()) {
    if (!p.hit.has(f) && overlap(box, f)) {
      p.hit.add(f);
      damageFoe(g, f, swingDamage(p), p.face, p.combo === 2);
    }
  }
  for (let i = g.shots.length - 1; i >= 0; i--) {
    const s = g.shots[i];
    if (s.hostile && s.kind !== 'wave' && overlap(box, s)) {
      g.shots.splice(i, 1);
      g.score += 2;
      g.freeze = Math.max(g.freeze, 0.03);
      burst(g, s.x, s.y, '#5ee6d1', 8, 200);
      g.events.push('parry');
    }
  }
}

function pickUpgrade(g, input) {
  let pick = input.pick - 1;
  if (input.click) pick = CARDS.findIndex((c) => input.click.x >= c.x && input.click.x <= c.x + c.w && input.click.y >= c.y && input.click.y <= c.y + c.h);
  if (pick < 0 || pick >= g.offers.length) return;
  const up = g.offers[pick];
  const p = g.player;
  up.apply(p.stats);
  g.taken.push(up.id);
  if (p.stats.healNow) { p.hp = maxHp(p); p.stats.healNow = false; }
  g.events.push('select');
  loadRoom(g, g.roomIndex + 1);
  g.state = 'playing';
}

/** One fixed step of the whole game. `input` is the snapshot the input module builds each frame. */
export function step(g, input, dt) {
  g.events.length = 0;
  g.time += dt;
  g.shake = Math.max(0, g.shake - dt * 1.6);
  updateParts(g, dt);
  if (g.state === 'title') {
    if (input.confirm) startRun(g);
    return;
  }
  if (g.state === 'dead' || g.state === 'victory') {
    g.endT += dt;
    if (input.confirm && g.endT > 0.6) startRun(g);
    return;
  }
  if (g.state === 'upgrade') {
    pickUpgrade(g, input);
    return;
  }
  // Hit stop freezes the action, but a press made during it is kept for the first step after it.
  if (g.freeze > 0) {
    g.freeze -= dt;
    g.buffered = g.buffered || {};
    for (const key of ['jumpPressed', 'attackPressed', 'dashPressed']) if (input[key]) g.buffered[key] = true;
    return;
  }
  if (g.buffered) {
    input = { ...input, jumpPressed: input.jumpPressed || Boolean(g.buffered.jumpPressed), attackPressed: input.attackPressed || Boolean(g.buffered.attackPressed), dashPressed: input.dashPressed || Boolean(g.buffered.dashPressed) };
    g.buffered = null;
  }

  g.roomTime += dt;
  g.runTime += dt;
  const p = g.player;
  movePlayer(p, input, g.room.platforms, dt, g.events);
  if (p.justLanded) { g.events.push('land'); burst(g, p.x + p.w / 2, p.y + p.h, '#8a8fa8', 5, 90, 2, 200); }
  if (g.events.includes('jump')) burst(g, p.x + p.w / 2, p.y + p.h, '#8a8fa8', 4, 80, 2, 200);
  if (p.dashT > 0) burst(g, p.x + p.w / 2 - p.dashDir * 12, p.y + p.h / 2, '#5ee6d1', 2, 50, 3, 0);
  swordPhase(g);

  if (g.roomTime > SPAWN_DELAY) {
    for (const f of g.foes) {
      updateFoe(f, g, dt);
      f.touchCd = Math.max(0, (f.touchCd || 0) - dt);
      if (f.touchCd <= 0 && overlap(f, p) && hurtPlayer(g, touchDamage(f), f.x + f.w / 2)) f.touchCd = 0.6;
    }
  }
  updateShots(g, dt);
  updatePickups(g, dt);

  if (g.victoryT > 0) {
    g.victoryT -= dt;
    if (g.victoryT <= 0) {
      g.state = 'victory';
      g.endT = 0;
      g.score += 500;
      g.best = Math.max(g.best, g.score);
      g.events.push('victory');
    }
    return;
  }
  if (g.state !== 'playing') return;
  if (g.foes.length === 0 && g.roomTime > SPAWN_DELAY && !g.doorOpen && !g.room.boss) {
    g.doorOpen = true;
    g.events.push('door');
  }
  if (g.doorOpen && overlap(p, DOOR)) {
    g.score += 50 + g.roomIndex * 25;
    g.offers = drawOffers(g);
    g.state = 'upgrade';
    g.events.push('clear');
  }
}

export { ROOMS };
