// Hands in Hollow Ember (Node 22, standard library only). The game is this directory's game/ folder: plain
// static files a desktop browser loads offline (game/index.html and its ES modules, no library and no
// network request). This program copies game/ and screenshots/ to /output and writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// Play it locally with `node serve.ts` and open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Stop with a reason on what the scorer would refuse: it takes 3 or 4 screenshots, each at most 256 KiB.
const SHOT_MAX_BYTES = 262144;
const shotsDir = join(here, 'screenshots');
const shotNames = existsSync(shotsDir) ? readdirSync(shotsDir).filter((name) => !name.startsWith('.')) : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  process.stderr.write(`hollow ember: screenshots/ holds ${shotNames.length} images, the scorer takes 3 or 4\n`);
  process.exit(1);
}
for (const name of shotNames) {
  const bytes = statSync(join(shotsDir, name)).size;
  if (bytes > SHOT_MAX_BYTES) {
    process.stderr.write(`hollow ember: screenshots/${name} is ${bytes} bytes, the scorer takes at most ${SHOT_MAX_BYTES}\n`);
    process.exit(1);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
