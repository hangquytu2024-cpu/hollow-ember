// Draws the world: sky, ruins, ledges, the door, the hero, every foe, shots and sparks. All art is
// drawn from shapes in code (no image files) in a palette of deep blue, teal and ember orange.
import { COLOR, GROUND_Y, H, PLAYER, W } from './config.js';
import { DOOR } from './game.js';

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function rect(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, g) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLOR.skyTop);
  sky.addColorStop(1, g.room && g.room.boss ? '#3a1020' : COLOR.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const shift = g.room ? g.room.seedShift : 0;
  glow(ctx, 740 + (shift % 90), 120, 190, g.room && g.room.boss ? '#ff6a4d' : '#7fe9ff', 0.28);
  ctx.fillStyle = g.room && g.room.boss ? '#ffb18a' : '#d9f6ff';
  ctx.beginPath();
  ctx.arc(740 + (shift % 90), 120, 34, 0, 6.283);
  ctx.fill();
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = layer === 0 ? '#121a2c' : '#0b1120';
    for (let i = 0; i < 12; i++) {
      const x = i * 90 - 20 + hash(i + shift + layer * 40) * 40;
      const h = 90 + hash(i * 3 + shift + layer * 17) * (layer === 0 ? 220 : 150);
      ctx.fillRect(x, GROUND_Y - h, 40 + hash(i + 9) * 36, h);
    }
  }
  for (let i = 0; i < 46; i++) {
    const x = (i * 97 + g.time * (10 + (i % 7) * 3)) % W;
    const y = H - ((i * 53 + g.time * (16 + (i % 5) * 4)) % H);
    ctx.globalAlpha = 0.25 + 0.5 * hash(i);
    ctx.fillStyle = i % 3 === 0 ? COLOR.emberHot : COLOR.ember;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawPlatforms(ctx, room) {
  for (const p of room.platforms) {
    if (p.ground) {
      rect(ctx, p.x, p.y, p.w, p.h, COLOR.stone);
      rect(ctx, p.x, p.y, p.w, 4, COLOR.stoneTop);
      for (let x = 20; x < p.w; x += 70) rect(ctx, x, p.y + 18, 36, 3, 'rgba(255,255,255,0.05)');
    } else {
      rect(ctx, p.x, p.y, p.w, p.h, COLOR.stone);
      rect(ctx, p.x, p.y, p.w, 4, COLOR.stoneTop);
      rect(ctx, p.x + 6, p.y + p.h, 3, 16, '#10141f');
      rect(ctx, p.x + p.w - 9, p.y + p.h, 3, 24, '#10141f');
    }
  }
}

function drawDoor(ctx, g) {
  const open = g.doorOpen;
  rect(ctx, DOOR.x - 6, DOOR.y - 8, DOOR.w + 12, DOOR.h + 8, '#10141f');
  const arch = ctx.createLinearGradient(0, DOOR.y, 0, DOOR.y + DOOR.h);
  arch.addColorStop(0, open ? '#9bfff0' : '#1a2233');
  arch.addColorStop(1, open ? '#2aa9a0' : '#0d111b');
  ctx.fillStyle = arch;
  ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  if (open) glow(ctx, DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h / 2, 90 + Math.sin(g.time * 4) * 10, COLOR.teal, 0.55);
}

function drawHero(ctx, g) {
  const p = g.player;
  if (g.state === 'dead') return;
  const blink = p.invuln > 0 && p.dashT <= 0 && Math.floor(g.time * 22) % 2 === 0;
  if (p.dashT > 0) {
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.18 * (4 - i);
      rect(ctx, p.x - p.dashDir * i * 14, p.y + 6, p.w, p.h - 6, COLOR.teal);
    }
  }
  ctx.globalAlpha = blink ? 0.35 : 1;
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h);
  ctx.scale(p.face, 1);
  const run = p.onGround ? Math.sin(g.time * 18) * Math.min(1, Math.abs(p.vx) / 100) : 0;
  ctx.fillStyle = '#10393f';
  ctx.beginPath(); // cloak
  ctx.moveTo(-10, -30); ctx.lineTo(-18 - Math.abs(p.vx) * 0.03, -4 + run * 2); ctx.lineTo(8, -2); ctx.lineTo(10, -30); ctx.closePath();
  ctx.fill();
  rect(ctx, -6, -14 + run * 2, 5, 14, '#1c2a38');
  rect(ctx, 2, -14 - run * 2, 5, 14, '#1c2a38');
  rect(ctx, -8, -30, 16, 18, '#2b6f77'); // torso
  ctx.fillStyle = '#d8cdb8';
  ctx.beginPath(); ctx.arc(0, -36, 8, 0, 6.283); ctx.fill(); // head
  rect(ctx, -9, -45, 18, 7, '#173f46'); // hood
  rect(ctx, 2, -37, 5, 3, COLOR.emberHot); // glowing eye
  if (p.swingT > 0) {
    const t = 1 - p.swingT / PLAYER.swingTime;
    ctx.strokeStyle = p.combo === 2 ? COLOR.emberHot : '#dffcff';
    ctx.lineWidth = p.combo === 2 ? 7 : 5;
    ctx.globalAlpha = (blink ? 0.35 : 1) * (1 - t * 0.6);
    ctx.beginPath();
    const reach = (p.combo === 2 ? 52 : 40) * p.stats.reach;
    ctx.arc(2, -22, reach, -1.2 + t * 0.6, 0.9 + t * 0.9);
    ctx.stroke();
    ctx.globalAlpha = blink ? 0.35 : 1;
  } else {
    rect(ctx, 8, -26, 3, 20, '#cfe9ee'); // sword at rest
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawHusk(ctx, f, t) {
  const step = Math.sin(t * 10 + f.x) * 2;
  ctx.save();
  ctx.translate(f.x + f.w / 2, f.y + f.h);
  ctx.scale(f.dir, 1);
  rect(ctx, -11, -8, 7, 8 + step, '#2b1a3a');
  rect(ctx, 4, -8, 7, 8 - step, '#2b1a3a');
  ctx.fillStyle = '#3d2552';
  ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-10, -28); ctx.lineTo(8, -30); ctx.lineTo(14, -6); ctx.closePath(); ctx.fill();
  rect(ctx, -2, -22, 3, 12, COLOR.ember);
  rect(ctx, 5, -26, 5, 4, COLOR.emberHot);
  ctx.restore();
}

function drawArcher(ctx, f) {
  ctx.save();
  ctx.translate(f.x + f.w / 2, f.y + f.h);
  ctx.scale(f.face, 1);
  ctx.fillStyle = '#26324a';
  ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-3, -34); ctx.lineTo(7, -34); ctx.lineTo(11, 0); ctx.closePath(); ctx.fill();
  rect(ctx, 2, -28, 5, 3, f.aim ? COLOR.blood : COLOR.teal);
  ctx.strokeStyle = '#a58b5b';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(10, -18, 14, -1.2, 1.2); ctx.stroke();
  if (f.aim) { ctx.strokeStyle = 'rgba(255,77,94,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, -18); ctx.lineTo(60, -18); ctx.stroke(); }
  ctx.restore();
}

function drawBat(ctx, f, t) {
  const flap = Math.sin(t * 22 + f.phase) * 9;
  ctx.save();
  ctx.translate(f.x + f.w / 2, f.y + f.h / 2);
  ctx.fillStyle = f.mode === 'swoop' ? '#7a2342' : '#3a2a52';
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-24, -10 + flap); ctx.lineTo(-16, 6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(24, -10 + flap); ctx.lineTo(16, 6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, 9, 8, 0, 0, 6.283); ctx.fill();
  rect(ctx, -5, -3, 3, 3, COLOR.ember);
  rect(ctx, 2, -3, 3, 3, COLOR.ember);
  ctx.restore();
}

function drawWarden(ctx, f, t) {
  const tele = f.mode === 'chargeTele' || f.mode === 'jump' || f.mode === 'orbsTele';
  ctx.save();
  ctx.translate(f.x + f.w / 2, f.y + f.h);
  ctx.scale(f.face, 1);
  ctx.fillStyle = tele && Math.floor(t * 14) % 2 === 0 ? '#7a2035' : '#2a1d3a';
  ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(-30, -70); ctx.lineTo(-12, -88); ctx.lineTo(18, -88); ctx.lineTo(34, -66); ctx.lineTo(38, 0); ctx.closePath(); ctx.fill();
  rect(ctx, -30, -76, 8, -14, '#d7c9b2'); // horns
  rect(ctx, 20, -76, 8, -14, '#d7c9b2');
  glow(ctx, 0, -44, 40, COLOR.ember, 0.65 + Math.sin(t * 6) * 0.2);
  ctx.fillStyle = COLOR.emberHot;
  ctx.beginPath(); ctx.arc(0, -44, 9, 0, 6.283); ctx.fill();
  rect(ctx, 8, -72, 10, 5, COLOR.blood);
  rect(ctx, -12, -72, 10, 5, COLOR.blood);
  ctx.restore();
}

function drawFoes(ctx, g) {
  for (const f of g.foes) {
    const arriving = g.roomTime < 0.8;
    ctx.globalAlpha = arriving ? 0.25 + 0.75 * (g.roomTime / 0.8) : 1;
    if (f.kind === 'husk') drawHusk(ctx, f, g.time);
    else if (f.kind === 'archer') drawArcher(ctx, f);
    else if (f.kind === 'bat') drawBat(ctx, f, g.time);
    else drawWarden(ctx, f, g.time);
    if (f.flash > 0) {
      ctx.globalAlpha = Math.min(0.85, f.flash * 9);
      rect(ctx, f.x, f.y, f.w, f.h, '#ffffff');
    }
    ctx.globalAlpha = 1;
    if (arriving) glow(ctx, f.x + f.w / 2, f.y + f.h / 2, 40, COLOR.ember, 0.5);
  }
}

function drawShots(ctx, g) {
  for (const s of g.shots) {
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    if (s.kind === 'arrow') {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(s.vy, s.vx));
      rect(ctx, -8, -2, 16, 4, '#d7c28f'); rect(ctx, 5, -4, 5, 8, COLOR.blood);
      ctx.restore();
    } else if (s.kind === 'orb') {
      glow(ctx, cx, cy, 22, '#ff5ec8', 0.8);
      ctx.fillStyle = '#ffd1f0'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 6.283); ctx.fill();
    } else if (s.kind === 'wave') {
      glow(ctx, cx, cy, 34, COLOR.ember, 0.7);
      ctx.fillStyle = COLOR.emberHot; ctx.beginPath(); ctx.ellipse(cx, cy + 4, 15, 12, 0, 0, 6.283); ctx.fill();
    } else {
      glow(ctx, cx, cy, 20, COLOR.teal, 0.8);
      ctx.fillStyle = '#e8ffff'; ctx.beginPath(); ctx.ellipse(cx, cy, 8, 5, 0, 0, 6.283); ctx.fill();
    }
  }
}

function drawPickups(ctx, g) {
  for (const k of g.pickups) {
    glow(ctx, k.x + 8, k.y + 8, 24, COLOR.blood, 0.6);
    ctx.fillStyle = '#ff7a8a';
    ctx.beginPath(); ctx.arc(k.x + 5, k.y + 6, 5, 0, 6.283); ctx.arc(k.x + 11, k.y + 6, 5, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(k.x, k.y + 8); ctx.lineTo(k.x + 8, k.y + 17); ctx.lineTo(k.x + 16, k.y + 8); ctx.fill();
  }
}

function drawParticles(ctx, g) {
  for (const q of g.parts) {
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x, q.y, q.size, q.size);
  }
  ctx.globalAlpha = 1;
}

/** Draw one frame of the world. The caller has already set the transform that maps 960 by 540 onto the canvas. */
export function drawWorld(ctx, g) {
  const sx = g.shake > 0 ? (Math.sin(g.time * 90) * g.shake * 9) : 0;
  const sy = g.shake > 0 ? (Math.cos(g.time * 77) * g.shake * 7) : 0;
  ctx.save();
  ctx.translate(sx, sy);
  drawBackground(ctx, g);
  if (g.room) {
    drawPlatforms(ctx, g.room);
    drawDoor(ctx, g);
    drawPickups(ctx, g);
    drawFoes(ctx, g);
    drawHero(ctx, g);
    drawShots(ctx, g);
  }
  drawParticles(ctx, g);
  ctx.restore();
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  if (g.player && g.player.hp === 1 && g.state === 'playing') {
    ctx.fillStyle = `rgba(255,40,60,${0.08 + 0.06 * Math.sin(g.time * 8)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

