// Vice City Multi-Panel Studio — entry program (Node 22, standard library only).
//
// The app is plain static files in app/ (index.html plus its ES modules,
// one bundled OFL font and two sample photos) and the screenshots in
// screenshots/. This program hands them in: it copies both folders into the
// output directory the grader provides and writes /output/dossier.json with
// buildDossier from the kit's vendored library (vendor/makefun-app.ts,
// unchanged). Run it twice and the bytes come out identical, because the
// copy is deterministic and the dossier is a pure function of the files.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps mirror the gate in RULES.txt: at most 4 screenshots of 256 KiB,
// app/ at most 993 files and 48 MiB, the dossier text capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
