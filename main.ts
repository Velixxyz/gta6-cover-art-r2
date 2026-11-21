// Vice City Multi-Panel Studio — entry program (Node 22, standard library only).
// Hands the app in: copies app/ and screenshots/ from beside this file to
// /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library. Runs twice and
// must write the same bytes both times, so nothing here depends on the clock,
// randomness, or the order the filesystem happens to list files in.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Count the plain files under a directory, following the scorer's caps, so a
// broken tree fails loudly here instead of silently shipping a bad entry.
function countTree(dir, seen = { files: 0, bytes: 0 }) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) countTree(path, seen);
    else if (name.isFile()) {
      seen.files += 1;
      seen.bytes += statSync(path).size;
    }
  }
  return seen;
}

const appTree = countTree(join(here, 'app'));
if (appTree.files > 993) throw new Error(`app/ holds ${appTree.files} files, over the 993 cap`);
if (appTree.bytes > 48 * 1024 * 1024) throw new Error(`app/ holds ${appTree.bytes} bytes, over the 48 MiB cap`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
const shots = existsSync(join(here, 'screenshots'))
  ? readdirSync(join(here, 'screenshots')).filter((n) => !n.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots/ holds ${shots.length} images, need 3 or 4`);
}
// The scorer refuses any screenshot over 256 KiB, so refuse it here too.
for (const name of shots) {
  const size = statSync(join(here, 'screenshots', name)).size;
  if (size > 262144) throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
}
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files, in all, or a path under app/ over 1000 bytes: app/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(
  `handed in ${appTree.files} app files (${appTree.bytes} bytes) and ${shots.length} screenshots`,
);
