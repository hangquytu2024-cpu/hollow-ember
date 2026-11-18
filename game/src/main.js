// The page: sizes the canvas, runs the fixed step loop, turns game events into sound, and draws the
// right screen for the game's state. With ?shot=<scene> it draws one scene and stops (used for the screenshots).
import { H, STEP, W } from './config.js';
import { createAudio } from './audio.js';
import { createGame, step } from './game.js';
import { createInput } from './input.js';
import { drawWorld } from './render.js';
import { buildScene } from './shots.js';
import { drawEnd, drawHud, drawPaused, drawTitle, drawUpgrade } from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const view = { scale: 1, ox: 0, oy: 0 };
const BEST_KEY = 'hollow-ember-best';

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  view.scale = Math.min(canvas.width / W, canvas.height / H);
  view.ox = (canvas.width - W * view.scale) / 2;
  view.oy = (canvas.height - H * view.scale) / 2;
}

/** Window pixels to the game's 960 by 540 space. */
function toLogical(clientX, clientY) {
  const dpr = window.devicePixelRatio || 1;
  return { x: (clientX * dpr - view.ox) / view.scale, y: (clientY * dpr - view.oy) / view.scale };
}

function drawFrame(g, paused) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  drawWorld(ctx, g);
  if (g.state === 'playing' || g.state === 'upgrade') drawHud(ctx, g);
  if (g.state === 'title') drawTitle(ctx, g);
  else if (g.state === 'upgrade') drawUpgrade(ctx, g);
  else if (g.state === 'dead') drawEnd(ctx, g, false);
  else if (g.state === 'victory') drawEnd(ctx, g, true);
  if (paused) drawPaused(ctx);
}

function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function saveBest(best) {
  try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* private mode: the best score just is not kept */ }
}

function play() {
  const g = createGame(7);
  g.best = readBest();
  const audio = createAudio();
  const input = createInput(canvas, toLogical);
  let paused = false;
  let last = performance.now();
  let acc = 0;

  const unlock = () => audio.unlock();
  window.addEventListener('keydown', unlock);
  canvas.addEventListener('mousedown', unlock);

  function frame(now) {
    acc = Math.min(0.1, acc + (now - last) / 1000);
    last = now;
    const snap = input.snapshot();
    if (snap.mute) audio.toggleMute();
    if (snap.pause && g.state === 'playing') paused = !paused;
    if (!paused) {
      let first = true;
      while (acc >= STEP) {
        step(g, first ? snap : { ...snap, jumpPressed: false, attackPressed: false, dashPressed: false, confirm: false, pick: 0, click: null }, STEP);
        first = false;
        acc -= STEP;
        for (const ev of g.events) {
          audio.play(ev);
          if (ev === 'die' || ev === 'victory') saveBest(g.best);
        }
      }
      audio.setBoss(Boolean(g.room && g.room.boss && g.state === 'playing'));
    } else acc = 0;
    drawFrame(g, paused);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

resize();
window.addEventListener('resize', resize);
const params = new URLSearchParams(location.search);
if (params.has('shot')) {
  const g = buildScene(params.get('shot'), Number(params.get('seed')) || 1);
  drawFrame(g, false);
  window.addEventListener('resize', () => drawFrame(g, false));
  document.title = `shot ${params.get('shot')}`;
} else play();
