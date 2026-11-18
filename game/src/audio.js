// All sound is synthesised with the Web Audio API: no audio files. Effects are short oscillator and noise
// bursts; the music is a slow minor-key loop whose tempo rises in the boss chamber.
const NOTE = (semi) => 55 * Math.pow(2, semi / 12); // semitones above A1
const BASS = [0, 0, 7, 5, 0, 0, 10, 8];
const LEAD = [24, null, 27, null, 31, null, 29, 27, 24, null, 22, null, 19, null, 22, null];

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
    hit: () => { noise(0.08, 0.22, 2600); tone(170, 70, 0.12, 'square', 0.16); },
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
    const b = BASS[beat % BASS.length];
    if (beat % 2 === 0) tone(NOTE(b), NOTE(b) * 0.99, 0.4, 'triangle', 0.1);
    const l = LEAD[beat % LEAD.length];
    if (l !== null && l !== undefined) tone(NOTE(l + b * 0), NOTE(l) * 1.005, 0.3, boss ? 'sawtooth' : 'sine', boss ? 0.035 : 0.045);
    beat += 1;
  }

  return {
    /** Call from a user gesture: browsers only let audio start after one. */
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (ctx && !timer) timer = setInterval(musicStep, 230);
    },
    play(name) {
      if (EFFECTS[name]) EFFECTS[name]();
    },
    setBoss(on) { if (boss !== on) { boss = on; if (timer) { clearInterval(timer); timer = setInterval(musicStep, on ? 170 : 230); } } },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.6;
      return muted;
    },
  };
}
