// Every number the game tunes with lives here: arena size, the hero's moves, the foes, the upgrades.
export const W = 960;
export const H = 540;
export const GROUND_Y = 480;
export const ROOMS = 5; // chambers per descent; the last one holds the boss
export const STEP = 1 / 60;

export const PLAYER = {
  w: 22, h: 36, speed: 215, jump: 610, gravity: 1750, fall: 900, maxHp: 5,
  dashTime: 0.2, dashSpeed: 600, dashCooldown: 0.8, hitInvuln: 1.0,
  swingTime: 0.27, comboWindow: 0.7, baseDamage: 10,
};

/** Foes: size, health, speed, touch damage, score. Health grows with the chamber number. */
export const FOES = {
  husk: { w: 28, h: 30, hp: 30, speed: 62, touch: 1, score: 10 },
  archer: { w: 22, h: 34, hp: 22, speed: 0, touch: 1, score: 15, fireEvery: 2.1 },
  bat: { w: 26, h: 20, hp: 14, speed: 120, touch: 1, score: 12, swoopEvery: 2.8 },
  warden: { w: 74, h: 92, hp: 380, speed: 0, touch: 1, score: 200 },
};

/** Which foes appear in chamber `index` (0 based), as a pool the room generator draws from. */
export const POOLS = [
  ['husk', 'husk', 'bat'],
  ['husk', 'archer', 'bat', 'husk'],
  ['husk', 'archer', 'bat', 'archer', 'husk'],
  ['husk', 'archer', 'bat', 'bat', 'archer', 'husk'],
];

/** The upgrades offered between chambers. Each one changes the hero's stats once. */
export const UPGRADES = [
  { id: 'edge', name: 'Whetted Edge', text: 'Your blade bites 30% deeper.', apply: (s) => { s.damage *= 1.3; } },
  { id: 'veil', name: 'Veilstep', text: 'The dash recovers 35% faster.', apply: (s) => { s.dashCooldown *= 0.65; } },
  { id: 'heart', name: 'Second Heart', text: '+1 maximum health and heal fully.', apply: (s) => { s.maxHpBonus += 1; s.healNow = true; } },
  { id: 'wind', name: 'Gale Boots', text: 'Run 15% faster and gain a third jump.', apply: (s) => { s.speed *= 1.15; s.maxJumps += 1; } },
  { id: 'spark', name: 'Ember Spark', text: 'Each swing also throws a spark of fire.', apply: (s) => { s.sparks = true; } },
  { id: 'leech', name: 'Ashen Thirst', text: 'Every fourth kill heals one heart.', apply: (s) => { s.leech = true; } },
  { id: 'reach', name: 'Long Reach', text: 'Your sword sweeps 30% wider.', apply: (s) => { s.reach *= 1.3; } },
];

/** Where the three upgrade cards sit, for drawing and for mouse picks. */
export const CARDS = [0, 1, 2].map((i) => ({ x: 90 + i * 270, y: 150, w: 240, h: 250 }));

export const COLOR = {
  skyTop: '#0a0f1d', skyBottom: '#2a1330', stone: '#1b2130', stoneTop: '#3a465e', ember: '#ff8a3d', emberHot: '#ffd36b',
  teal: '#5ee6d1', blood: '#ff4d5e', text: '#f3ecdf', dim: '#9a93a8', gold: '#ffd36b',
};
