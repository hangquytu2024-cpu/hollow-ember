// Keyboard and mouse in, one snapshot per frame out. Edge presses (jump, attack, dash, confirm) are
// remembered until the snapshot is taken, so a quick tap between two frames is never lost.
const KEYS = {
  left: ['a', 'A', 'ArrowLeft'], right: ['d', 'D', 'ArrowRight'],
  jump: ['w', 'W', 'ArrowUp', ' '], attack: ['j', 'J', 'z', 'Z'], dash: ['k', 'K', 'x', 'X', 'Shift', 'c', 'C'],
  confirm: ['Enter', ' '],
};
const GAME_KEYS = new Set(Object.values(KEYS).flat().concat(['1', '2', '3', 'p', 'P', 'Escape', 'm', 'M']));

export function createInput(canvas, toLogical) {
  const held = new Set();
  let edge = { jump: false, attack: false, dash: false, confirm: false, pick: 0, click: null, aimX: null, pause: false, mute: false };

  const isKey = (name, key) => KEYS[name].includes(key);

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.key)) e.preventDefault();
    if (e.repeat) return;
    held.add(e.key);
    if (isKey('jump', e.key)) edge.jump = true;
    if (isKey('attack', e.key)) edge.attack = true;
    if (isKey('dash', e.key)) edge.dash = true;
    if (isKey('confirm', e.key)) edge.confirm = true;
    if (e.key === '1' || e.key === '2' || e.key === '3') edge.pick = Number(e.key);
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') edge.pause = true;
    if (e.key === 'm' || e.key === 'M') edge.mute = true;
  });
  window.addEventListener('keyup', (e) => held.delete(e.key));
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
      edge = { jump: false, attack: false, dash: false, confirm: false, pick: 0, click: null, aimX: null, pause: false, mute: false };
      return out;
    },
  };
}
