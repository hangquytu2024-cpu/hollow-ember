// Screenshot scenes behind ?shot=title|boss|upgrade|defeat. Each one plays the real rules forward from a
// fresh descent with a simple autopilot, so the frame is what the game really draws at that moment and
// the same seed always gives the same frame.
import { STEP, UPGRADES } from './config.js';
import { createGame, DOOR, enterRoom, startRun, step } from './game.js';

const IDLE = { x: 0, jumpPressed: false, jumpHeld: false, attackPressed: false, dashPressed: false, confirm: false, pick: 0, click: null, aimX: null };

/** The autopilot: walk to the nearest foe, climb to it when it is above, swing when close, dash at arrows. */
export function pilot(g, frame) {
  const input = { ...IDLE };
  const p = g.player;
  if (g.state === 'upgrade') return { ...input, pick: 1 + (frame % 3) };
  let target = null;
  let best = Infinity;
  for (const f of g.foes) {
    const d = Math.abs(f.x - p.x) + Math.abs(f.y - p.y) * 0.5;
    if (d < best) { best = d; target = f; }
  }
  const goal = target ? target.x + target.w / 2 : DOOR.x + 20;
  const dx = goal - (p.x + p.w / 2);
  input.x = Math.abs(dx) < 28 ? 0 : Math.sign(dx);
  if (target && Math.abs(dx) < 66 && Math.abs(target.y - p.y) < 64) input.attackPressed = frame % 7 === 0;
  if (target && target.y < p.y - 30 && frame % 16 === 0) input.jumpPressed = true;
  input.jumpHeld = true;
  for (const s of g.shots) if (s.hostile && Math.abs(s.x - p.x) < 120 && Math.abs(s.y - p.y) < 60 && frame % 5 === 0) input.dashPressed = true;
  return input;
}

/** Step the game with the autopilot until `done(g)` is true or `cap` frames pass. Returns the frame count. */
function playUntil(g, done, cap) {
  let frame = 0;
  while (frame < cap && !done(g)) {
    step(g, pilot(g, frame), STEP);
    frame += 1;
  }
  return frame;
}

function freshRun(seed) {
  const g = createGame(seed);
  startRun(g, seed);
  return g;
}

/** A frame of live combat: foes on screen, the sword out, sparks flying, the hero still healthy. */
function combat(seed) {
  const ok = (x) => x.state === 'playing' && x.kills >= 2 && x.foes.length >= 1 && x.player.hp >= 3 && x.player.swingT > 0.1 && x.parts.length > 2;
  for (let tries = 0; tries < 6; tries++) {
    const g = freshRun(seed + tries);
    playUntil(g, (x) => ok(x) || x.state !== 'playing', 1500);
    if (ok(g)) return g;
  }
  return freshRun(seed);
}

/** The Warden fight: the hero arrives with three boons, and the frame is taken mid-fight with the Warden's shots in the air. */
function bossFight(seed) {
  const g = freshRun(seed);
  for (const id of ['edge', 'veil', 'spark', 'heart']) {
    UPGRADES.find((u) => u.id === id).apply(g.player.stats);
    g.taken.push(id);
  }
  g.player.stats.healNow = false;
  g.player.hp = 6;
  g.score = 340;
  g.kills = 14;
  enterRoom(g, 4);
  const ok = (x) => x.state === 'playing' && x.foes.length === 1 && x.foes[0].hp < x.foes[0].maxHp && x.shots.some((s) => s.hostile) && x.player.hp >= 2;
  playUntil(g, (x) => ok(x) || x.state !== 'playing', 4000);
  return g;
}

export function buildScene(name, seed) {
  if (name === 'title') {
    const g = createGame(seed);
    g.time = 2.6;
    return g;
  }
  if (name === 'boss') return bossFight(seed);
  if (name === 'play') return combat(seed);
  const g = combat(seed);
  if (name === 'upgrade') {
    playUntil(g, (x) => x.state === 'upgrade' || x.state === 'dead', 400);
    if (g.state !== 'upgrade') {
      g.foes.length = 0;
      playUntil(g, (x) => x.doorOpen, 120);
      g.player.x = DOOR.x;
      step(g, IDLE, STEP);
    }
    return g;
  }
  g.player.hp = 1;
  playUntil(g, (x) => x.state === 'dead', 4000);
  if (g.state !== 'dead') g.player.hp = 0;
  for (let i = 0; i < 80; i++) step(g, IDLE, STEP);
  return g;
}
