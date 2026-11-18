# hollow-ember

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/hangquytu2024-cpu/hollow-ember/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/hangquytu2024-cpu/hollow-ember/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Hollow Ember is a fast 2D action platformer with a roguelite shape. You fall through five chambers of a ruined, ember-lit hollow, cut down what lives there, pick one boon between rooms, and then face the Warden. Die and you start over in a new set of rooms.

It is all plain HTML, canvas and JavaScript modules. There are no libraries, no image files and no audio files: the art is drawn in code and the sound is made with the Web Audio API.

**How it plays**

- Run, jump (twice in the air, three times with Gale Boots) and swing a three hit sword combo. The third hit is wider and hits harder.
- Dash to slip through anything. The dash makes you untouchable for a moment, and its cooldown shows on the HUD.
- Swinging at an arrow knocks it out of the air.
- Husks patrol their ledges, archers aim and fire, bats circle and then swoop. Every chamber is drawn from a seed, so the ledges and the foes change each descent.
- After each chamber you choose one of three boons: a sharper blade, a faster dash, a second heart, a spark of fire with every swing, a life leech, wider reach, faster feet.
- The Warden charges, leaps and slams the floor, and throws fans of fire. It gets faster when it is hurt.

**Controls:** A and D or the arrow keys to move, W or Space to jump, J, Z or a mouse click to strike, K, X or Shift to dash, 1 to 3 or a click to pick a boon, Enter to start or restart, P to pause, M to mute.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Node 22.18 or newer, nothing to install. To build the files the bounty hands in: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

## Files

- `game/src/game.js` holds the rules and the state machine. It touches no browser API, so the same code runs in a Node smoke test.
- `game/src/player.js`, `foes.js`, `level.js` and `config.js` hold the hero, the creatures, the chamber builder and every tuning number.
- `game/src/render.js` and `ui.js` draw the world and the screens. `audio.js` makes the sound. `input.js` reads the keyboard and mouse. `main.js` runs the loop.
- `game/src/shots.js` builds the scenes behind the screenshots in `screenshots/`: open `index.html?shot=boss` (or `title`, `upgrade`, `defeat`) to see them. Each one plays the real game forward with a small autopilot.

---

<sub>Entered on [make.fun](https://make.fun/?ref=x2mfc4pb&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
