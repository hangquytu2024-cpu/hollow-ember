// The hero: running, double jump, dash with invulnerability, and a three hit sword combo.
import { PLAYER, W } from './config.js';

export function createPlayer() {
  return {
    x: 50, y: 400, w: PLAYER.w, h: PLAYER.h, vx: 0, vy: 0, face: 1, onGround: false, jumps: 2, hp: PLAYER.maxHp,
    invuln: 0, dashT: 0, dashCd: 0, dashDir: 1, swingT: 0, combo: 0, comboT: 0, hit: new Set(), justSwung: false,
    justLanded: false, stats: { damage: 1, speed: 1, dashCooldown: 1, maxJumps: 2, maxHpBonus: 0, healNow: false, sparks: false, leech: false, reach: 1 },
  };
}

export const maxHp = (p) => PLAYER.maxHp + p.stats.maxHpBonus;

/** The sword's hit box while the blade is out, else null. The third hit of a combo is wider and hits harder. */
export function swingBox(p) {
  const active = p.swingT > 0.04 && p.swingT < PLAYER.swingTime - 0.06;
  if (!active) return null;
  const w = (p.combo === 2 ? 74 : 54) * p.stats.reach;
  return { x: p.face > 0 ? p.x + p.w - 4 : p.x - w + 4, y: p.y - 4, w, h: p.h + 8 };
}

export const swingDamage = (p) => PLAYER.baseDamage * p.stats.damage * (p.combo === 2 ? 1.7 : 1);

/** Advance the hero one step: timers, input, gravity and landing on ledges. Sets justSwung and justLanded for the caller. */
export function movePlayer(p, input, platforms, dt, events) {
  const s = p.stats;
  p.justSwung = false;
  p.justLanded = false;
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.comboT = Math.max(0, p.comboT - dt);
  p.swingT = Math.max(0, p.swingT - dt);

  if (input.dashPressed && p.dashCd <= 0 && p.dashT <= 0) {
    p.dashT = PLAYER.dashTime;
    p.dashCd = PLAYER.dashCooldown * s.dashCooldown;
    p.dashDir = input.x !== 0 ? Math.sign(input.x) : p.face;
    p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.1);
    events.push('dash');
  }
  if (input.attackPressed && p.swingT <= 0 && p.dashT <= 0) {
    p.combo = p.comboT > 0 ? (p.combo + 1) % 3 : 0;
    p.comboT = PLAYER.comboWindow;
    p.swingT = PLAYER.swingTime;
    p.hit = new Set();
    if (input.aimX !== null && input.aimX !== undefined) p.face = input.aimX >= p.x + p.w / 2 ? 1 : -1;
    else if (input.x !== 0) p.face = Math.sign(input.x);
    p.vx += p.face * 90;
    p.justSwung = true;
    events.push('swing');
  }

  if (p.dashT > 0) {
    p.dashT -= dt;
    p.vx = p.dashDir * PLAYER.dashSpeed;
    p.vy = 0;
  } else {
    const slow = p.swingT > 0 ? 0.55 : 1;
    const target = input.x * PLAYER.speed * s.speed * slow;
    const accel = (p.onGround ? 2600 : 1500) * dt;
    p.vx += Math.max(-accel, Math.min(accel, target - p.vx));
    if (input.x !== 0 && p.swingT <= 0) p.face = Math.sign(input.x);
    if (input.jumpPressed && p.jumps > 0) {
      p.vy = -PLAYER.jump;
      p.jumps -= 1;
      p.onGround = false;
      events.push('jump');
    }
    if (!input.jumpHeld && p.vy < -220) p.vy = -220;
    p.vy = Math.min(p.vy + PLAYER.gravity * dt, PLAYER.fall);
  }

  p.x = Math.max(0, Math.min(W - p.w, p.x + p.vx * dt));
  const before = p.y + p.h;
  p.y += p.vy * dt;
  const wasAir = !p.onGround;
  p.onGround = false;
  if (p.vy >= 0) {
    for (const pl of platforms) {
      const over = p.x + p.w > pl.x && p.x < pl.x + pl.w;
      if (over && before <= pl.y + 3 && p.y + p.h >= pl.y) {
        p.y = pl.y - p.h;
        if (p.vy > 320 && wasAir) p.justLanded = true;
        p.vy = 0;
        p.onGround = true;
        p.jumps = s.maxJumps;
      }
    }
  }
}
