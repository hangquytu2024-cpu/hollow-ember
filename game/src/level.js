// Builds one chamber: the floor, a few floating ledges, and which foe stands on which ledge.
import { FOES, GROUND_Y, POOLS, ROOMS, W } from './config.js';

const ROWS = [405, 335, 265]; // heights a ledge can sit at, low to high; each step up is within one jump

/** A chamber for descent step `index` (0 based). The last one is the boss chamber. */
export function buildRoom(index, rng) {
  const boss = index === ROOMS - 1;
  const platforms = [{ x: 0, y: GROUND_Y, w: W, h: 60, ground: true }];
  if (!boss) {
    for (const y of ROWS) {
      const count = rng.int(1, 2);
      let cursor = rng.range(40, 200);
      for (let i = 0; i < count; i++) {
        const w = rng.range(120, 210);
        if (cursor + w > W - 120) break;
        platforms.push({ x: Math.round(cursor), y, w: Math.round(w), h: 16 });
        cursor += w + rng.range(120, 260);
      }
    }
  } else {
    platforms.push({ x: 120, y: 350, w: 150, h: 16 }, { x: W - 270, y: 350, w: 150, h: 16 });
  }
  const spawns = [];
  if (boss) {
    spawns.push({ kind: 'warden', platform: 0 });
  } else {
    const pool = POOLS[Math.min(index, POOLS.length - 1)];
    const count = 3 + index;
    for (let i = 0; i < count; i++) {
      const kind = rng.pick(pool);
      const perch = kind === 'bat' ? 0 : rng.int(0, platforms.length - 1);
      spawns.push({ kind, platform: perch });
    }
  }
  return { index, boss, platforms, spawns, seedShift: rng.int(0, 9999) };
}

/** Where a foe of `kind` starts standing on `platform`, spread out so foes do not stack. */
export function spawnPoint(room, spawn, slot) {
  const def = FOES[spawn.kind];
  const p = room.platforms[spawn.platform];
  if (spawn.kind === 'bat') return { x: 80 + ((slot * 173) % (W - 160)), y: 120 + (slot % 3) * 40 };
  const span = Math.max(0, p.w - def.w);
  const x = p.ground ? 200 + ((slot * 211) % (W - 400)) : p.x + span * (0.2 + ((slot * 37) % 60) / 100);
  return { x, y: p.y - def.h };
}
