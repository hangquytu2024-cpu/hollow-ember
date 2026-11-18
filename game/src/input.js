// Keyboard and mouse in, one snapshot per frame out. Edge presses (jump, attack, dash, confirm) are
// remembered until the snapshot is taken, so a quick tap between two frames is never lost. Keys are read
// by physical position (event.code), so holding A and then pressing Shift never leaves a key stuck.
const KEYS = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp', 'Space'], attack: ['KeyJ', 'KeyZ'], dash: ['KeyK', 'KeyX', 'KeyC', 'ShiftLeft', 'ShiftRight'],
  confirm: ['Enter', 'NumpadEnter', 'Space'],
};
const PICKS = { Digit1: 1, Digit2: 2, Digit3: 3, Numpad1: 1, Numpad2: 2, Numpad3: 3 };
const GAME_KEYS = new Set(Object.values(KEYS).flat().concat(Object.keys(PICKS), ['KeyP', 'Escape', 'KeyM']));
const blankEdge = () => ({ jump: false, attack: false, dash: false, confirm: false, pick: 0, click: null, aimX: null, pause: false, mute: false });

export function createInput(canvas, toLogical) {
  const held = new Set();
  let edge = blankEdge();

  const isKey = (name, code) => KEYS[name].includes(code);

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    held.add(e.code);
    if (isKey('jump', e.code)) edge.jump = true;
    if (isKey('attack', e.code)) edge.attack = true;
    if (isKey('dash', e.code)) edge.dash = true;
    if (isKey('confirm', e.code)) edge.confirm = true;
    if (PICKS[e.code]) edge.pick = PICKS[e.code];
    if (e.code === 'KeyP' || e.code === 'Escape') edge.pause = true;
    if (e.code === 'KeyM') edge.mute = true;
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const at = toLogical(e.clientX, e.clientY);
    edge.attack = true;
    edge.confirm = true;
    edge.click = at;
    edge.aimX = at.x;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const any = (name) => KEYS[name].some((k) => held.has(k));

  return {
    /** The frame's input: movement held, presses since the last snapshot. */
    snapshot() {
      const out = {
        x: (any('right') ? 1 : 0) - (any('left') ? 1 : 0),
        jumpHeld: any('jump'),
        jumpPressed: edge.jump, attackPressed: edge.attack, dashPressed: edge.dash,
        confirm: edge.confirm, pick: edge.pick, click: edge.click, aimX: edge.aimX,
        pause: edge.pause, mute: edge.mute,
      };
      edge = blankEdge();
      return out;
    },
  };
}
