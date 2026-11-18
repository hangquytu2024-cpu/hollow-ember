// All sound is synthesised with the Web Audio API: no audio files. Effects are short oscillator and noise
// bursts; the music is a slow minor-key loop whose tempo rises in the boss chamber.
const NOTE = (semi) => 55 * Math.pow(2, semi / 12); // semitones above A1
// A driving D minor loop: 16 steps to a bar. The bass moves every second step, the lead plays the gaps.
const BASS = [5, 5, 8, 5, 10, 10, 8, 3];
const LEAD = [29, null, 33, null, 36, null, 33, null, 31, null, 34, null, 38, 34, 31, null];

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let beat = 0;
  let timer = null;
  let boss = false;

  function ensure() {
    if (ctx || typeof AudioContext === 'undefined') return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
  }

  function tone(f0, f1, dur, type = 'square', vol = 0.15, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.2, freq = 2000, kind = 'lowpass') {
    if (!ctx) return;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = buffer;
    filter.type = kind;
    filter.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t);
  }

  const arp = (notes, step, type = 'triangle', vol = 0.14) => notes.forEach((n, i) => tone(n, n * 1.01, 0.22, type, vol, i * step));

  const EFFECTS = {
    swing: () => { noise(0.12, 0.14, 1800, 'highpass'); tone(320, 170, 0.1, 'sawtooth', 0.06); },
    hit: () => { noise(0.08, 0.22, 2600); tone(170, 70, 0.12, 'square', 0.16); tone(110, 45, 0.16, 'sine', 0.28); },
    smash: () => { noise(0.14, 0.3, 3200); tone(150, 50, 0.2, 'square', 0.2); tone(80, 32, 0.3, 'sine', 0.4); },
    clang: () => { tone(1400, 1100, 0.14, 'triangle', 0.16); tone(2100, 1700, 0.1, 'sine', 0.08); noise(0.05, 0.12, 5000, 'highpass'); },
    break: () => { arp([880, 660, 440], 0.04, 'square', 0.12); noise(0.2, 0.25, 1500); tone(120, 40, 0.25, 'sine', 0.3); },
    rush: () => { noise(0.3, 0.2, 600, 'bandpass'); tone(140, 90, 0.3, 'sawtooth', 0.08); },
    kill: () => { tone(240, 50, 0.3, 'sawtooth', 0.16); noise(0.22, 0.2, 900); },
    hurt: () => { tone(320, 80, 0.3, 'square', 0.2); noise(0.15, 0.18, 700); },
    jump: () => tone(280, 560, 0.12, 'sine', 0.12),
    land: () => noise(0.05, 0.1, 500),
    dash: () => noise(0.2, 0.16, 900, 'bandpass'),
    pickup: () => arp([660, 990], 0.07, 'triangle', 0.14),
    door: () => arp([220, 330, 440], 0.12, 'sine', 0.16),
    clear: () => arp([330, 440, 660], 0.09, 'triangle', 0.16),
    select: () => arp([440, 660, 880], 0.06, 'triangle', 0.16),
    start: () => arp([220, 330, 440, 660], 0.08, 'triangle', 0.14),
    die: () => { tone(220, 30, 0.9, 'sawtooth', 0.2); noise(0.5, 0.15, 400); },
    victory: () => arp([330, 440, 550, 660, 880], 0.12, 'triangle', 0.18),
    arrow: () => tone(720, 480, 0.08, 'square', 0.07),
    parry: () => { tone(1300, 1900, 0.08, 'sine', 0.14); noise(0.06, 0.1, 4000, 'highpass'); },
    slam: () => { tone(90, 30, 0.45, 'sine', 0.3); noise(0.3, 0.25, 300); },
    warden: () => tone(90, 60, 0.35, 'sawtooth', 0.14),
    orb: () => tone(380, 720, 0.18, 'sine', 0.12),
    screech: () => tone(900, 1500, 0.1, 'sawtooth', 0.05),
  };

  function musicStep() {
    if (!ctx || muted) return;
    const s = beat % 16;
    const bar = Math.floor(beat / 16);
    if (s % 4 === 0) tone(130, 42, 0.14, 'sine', 0.24); // kick
    if (s === 4 || s === 12) noise(0.1, 0.09, 1800, 'bandpass'); // snare
    if (s % 2 === 1) noise(0.03, 0.04, 7500, 'highpass'); // hat
    if (s % 2 === 0) {
      const b = BASS[(s / 2 + (bar % 2) * 2) % BASS.length];
      tone(NOTE(b), NOTE(b) * 0.99, 0.28, 'triangle', 0.12);
      if (boss) tone(NOTE(b + 12), NOTE(b + 12), 0.2, 'sawtooth', 0.03);
    }
    const l = LEAD[s];
    if (l !== null && l !== undefined && bar % 4 !== 3) tone(NOTE(l), NOTE(l) * 1.004, 0.26, boss ? 'sawtooth' : 'square', boss ? 0.035 : 0.028);
    beat += 1;
  }

  return {
    /** Call from a user gesture: browsers only let audio start after one. */
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (ctx && !timer) timer = setInterval(musicStep, 150);
    },
    play(name) {
      if (EFFECTS[name]) EFFECTS[name]();
    },
    setBoss(on) { if (boss !== on) { boss = on; if (timer) { clearInterval(timer); timer = setInterval(musicStep, on ? 118 : 150); } } },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.6;
      return muted;
    },
  };
}
