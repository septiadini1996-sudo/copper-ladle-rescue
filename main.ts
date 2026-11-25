// The Copper Ladle — entrypoint (Node 22, standard library only).
//
// The game itself is the game/ folder beside this file: plain static files a desktop
// browser loads fully offline (game/index.html and its ES modules — no library, no
// network request). This program hands it in: it copies game/ and screenshots/ to the
// output directory and writes dossier.json, the summary the judge reads, with the
// vendored make.fun library.
//
// Run it:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it: serve the game/ folder with any static file server and open index.html.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps, mirrored from the kit so an entry the scorer would refuse is
// refused here first: at most 4 screenshots of at most 256 KiB each, at most 993
// files and 48 MiB under game/, no game/ path over 1000 bytes.
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
