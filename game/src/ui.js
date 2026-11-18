// Everything drawn on top of the world: the HUD, the title screen, the upgrade cards and the end screens.
import { CARDS, COLOR, H, ROOMS, W } from './config.js';
import { maxHp } from './player.js';

const SANS = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

function text(ctx, str, x, y, size, color = COLOR.text, align = 'left', weight = '600', face = SANS) {
  ctx.font = `${weight} ${size}px ${face}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function shadowed(ctx, str, x, y, size, color, align, weight, face) {
  text(ctx, str, x + 2, y + 3, size, 'rgba(0,0,0,0.65)', align, weight, face);
  text(ctx, str, x, y, size, color, align, weight, face);
}

function heart(ctx, x, y, full) {
  ctx.fillStyle = full ? '#ff4d5e' : 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(x + 6, y + 6, 6, 0, 6.283);
  ctx.arc(x + 16, y + 6, 6, 0, 6.283);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y + 8); ctx.lineTo(x + 11, y + 21); ctx.lineTo(x + 22, y + 8);
  ctx.fill();
  if (!full) { ctx.strokeStyle = 'rgba(255,77,94,0.5)'; ctx.lineWidth = 1.5; ctx.stroke(); }
}

function panel(ctx, x, y, w, h, alpha = 0.55) {
  ctx.fillStyle = `rgba(6,9,18,${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(94,230,209,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** Hearts, dash charge, chamber, score, boons and the boss bar. */
export function drawHud(ctx, g) {
  const p = g.player;
  for (let i = 0; i < maxHp(p); i++) heart(ctx, 18 + i * 28, 16, i < p.hp);
  const ready = 1 - p.dashCd / (0.8 * p.stats.dashCooldown);
  panel(ctx, 18, 46, 120, 12, 0.6);
  ctx.fillStyle = ready >= 1 ? COLOR.teal : '#2c6b68';
  ctx.fillRect(20, 48, 116 * Math.max(0, Math.min(1, ready)), 8);
  text(ctx, ready >= 1 ? 'DASH READY' : 'DASH', 146, 57, 11, COLOR.dim, 'left', '700');
  shadowed(ctx, `CHAMBER ${g.roomIndex + 1} / ${ROOMS}`, W / 2, 30, 18, COLOR.text, 'center', '700');
  shadowed(ctx, `SCORE ${g.score}`, W - 20, 28, 18, COLOR.gold, 'right', '700');
  text(ctx, `BEST ${Math.max(g.best, g.score)}`, W - 20, 48, 12, COLOR.dim, 'right', '700');
  g.taken.forEach((id, i) => {
    const up = id.slice(0, 1).toUpperCase();
    ctx.fillStyle = 'rgba(94,230,209,0.18)';
    ctx.fillRect(18 + i * 26, 68, 22, 22);
    text(ctx, up, 29 + i * 26, 84, 14, COLOR.teal, 'center', '800');
  });
  const boss = g.foes.find((f) => f.kind === 'warden');
  if (boss) {
    panel(ctx, W / 2 - 220, H - 44, 440, 22, 0.7);
    ctx.fillStyle = '#c22a3c';
    ctx.fillRect(W / 2 - 217, H - 41, 434 * (boss.hp / boss.maxHp), 16);
    text(ctx, 'THE WARDEN', W / 2, H - 50, 13, COLOR.text, 'center', '800');
  }
  if (g.doorOpen && g.state === 'playing') shadowed(ctx, 'The way down is open', W - 130, GROUND_HINT, 15, COLOR.teal, 'center', '700');
  else if (g.roomTime < 2.4 && !g.room.boss) shadowed(ctx, 'Clear the chamber', W / 2, 90, 15, COLOR.dim, 'center', '700');
  else if (g.room.boss && g.roomTime < 3) shadowed(ctx, 'The Warden wakes', W / 2, 90, 17, COLOR.blood, 'center', '800');
}
const GROUND_HINT = 395;

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(4,6,14,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

export function drawTitle(ctx, g) {
  dim(ctx, 0.5);
  const pulse = 0.75 + Math.sin(g.time * 2) * 0.1;
  ctx.save();
  ctx.shadowColor = COLOR.ember;
  ctx.shadowBlur = 40 * pulse;
  text(ctx, 'HOLLOW EMBER', W / 2, 178, 82, COLOR.emberHot, 'center', '800', SERIF);
  ctx.restore();
  shadowed(ctx, 'Descend five chambers. Wake the Warden. Burn bright.', W / 2, 220, 20, COLOR.text, 'center', '600', SERIF);
  panel(ctx, W / 2 - 250, 256, 500, 120, 0.6);
  const rows = [['A / D  or  arrows', 'move'], ['W / Space', 'jump (twice in the air)'], ['J / Z / click', 'sword, three hit combo'], ['K / X / Shift', 'dash through danger']];
  rows.forEach(([k, v], i) => {
    text(ctx, k, W / 2 - 230, 286 + i * 26, 16, COLOR.teal, 'left', '700');
    text(ctx, v, W / 2 + 10, 286 + i * 26, 16, COLOR.text, 'left', '500');
  });
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(g.time * 3.5);
  shadowed(ctx, 'Press Enter or click to begin', W / 2, 428, 24, COLOR.gold, 'center', '700');
  ctx.globalAlpha = 1;
  text(ctx, g.best > 0 ? `Best descent: ${g.best}` : 'M mutes the sound, P pauses', W / 2, 462, 15, COLOR.dim, 'center', '600');
}

export function drawUpgrade(ctx, g) {
  dim(ctx, 0.72);
  shadowed(ctx, 'The chamber is clear. Choose a boon.', W / 2, 96, 34, COLOR.gold, 'center', '800', SERIF);
  text(ctx, 'Press 1, 2 or 3, or click a card', W / 2, 126, 16, COLOR.dim, 'center', '600');
  g.offers.forEach((up, i) => {
    const c = CARDS[i];
    panel(ctx, c.x, c.y, c.w, c.h, 0.85);
    ctx.strokeStyle = COLOR.teal;
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    text(ctx, String(i + 1), c.x + 18, c.y + 38, 30, COLOR.teal, 'left', '800', SERIF);
    ctx.fillStyle = 'rgba(255,138,61,0.18)';
    ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y + 96, 34, 0, 6.283); ctx.fill();
    text(ctx, up.name.slice(0, 1), c.x + c.w / 2, c.y + 110, 40, COLOR.emberHot, 'center', '800', SERIF);
    text(ctx, up.name, c.x + c.w / 2, c.y + 160, 22, COLOR.text, 'center', '800', SERIF);
    wrap(ctx, up.text, c.x + c.w / 2, c.y + 192, c.w - 36, 18);
  });
}

function wrap(ctx, str, x, y, maxW, lineH) {
  ctx.font = `500 15px ${SANS}`;
  const words = str.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      text(ctx, line, x, yy, 15, COLOR.dim, 'center', '500');
      line = w;
      yy += lineH;
    } else line = test;
  }
  text(ctx, line, x, yy, 15, COLOR.dim, 'center', '500');
}

export function drawEnd(ctx, g, won) {
  dim(ctx, 0.74);
  ctx.save();
  ctx.shadowColor = won ? COLOR.teal : COLOR.blood;
  ctx.shadowBlur = 30;
  text(ctx, won ? 'THE WARDEN IS ASH' : 'YOU FELL', W / 2, 150, 66, won ? COLOR.teal : COLOR.blood, 'center', '800', SERIF);
  ctx.restore();
  panel(ctx, W / 2 - 230, 186, 460, 190, 0.7);
  const mins = Math.floor(g.runTime / 60);
  const secs = String(Math.floor(g.runTime % 60)).padStart(2, '0');
  const lines = [
    ['Chambers reached', `${g.roomIndex + 1} of ${ROOMS}`], ['Foes slain', String(g.kills)],
    ['Time in the hollow', `${mins}:${secs}`], ['Boons taken', String(g.taken.length)], ['Score', String(g.score)], ['Best', String(Math.max(g.best, g.score))],
  ];
  lines.forEach(([k, v], i) => {
    text(ctx, k, W / 2 - 205, 218 + i * 28, 18, COLOR.dim, 'left', '600');
    text(ctx, v, W / 2 + 205, 218 + i * 28, 18, i === 4 ? COLOR.gold : COLOR.text, 'right', '800');
  });
  ctx.globalAlpha = g.endT < 0.6 ? 0.45 : 0.75 + 0.25 * Math.sin(g.time * 3.5);
  shadowed(ctx, 'Press Enter or click to descend again', W / 2, 428, 24, COLOR.gold, 'center', '700');
  ctx.globalAlpha = 1;
}

export function drawPaused(ctx) {
  dim(ctx, 0.6);
  shadowed(ctx, 'PAUSED', W / 2, H / 2, 54, COLOR.text, 'center', '800', SERIF);
  text(ctx, 'Press P to continue', W / 2, H / 2 + 36, 18, COLOR.dim, 'center', '600');
}
