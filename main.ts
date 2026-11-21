// main.ts — Vice City Multi-Panel Studio entry point.
// Standard-library-only Node: copies app/ and screenshots/ to the output
// directory and writes dossier.json via buildDossier from the vendor module.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const REPO = resolve(import.meta.dirname);
const OUT = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : resolve(REPO, 'out');

const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 48 * 1024 * 1024;
const SHOT_MAX_BYTES = 256 * 1024;
const DOSSIER_MAX_BYTES = 1536 * 1024;

function walk(dir: string, base: string, acc: string[]): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = base ? base + '/' + entry.name : entry.name;
    if (entry.isDirectory()) walk(full, rel, acc);
    else acc.push(rel);
  }
  return acc;
}

function byteSizeOf(dir: string): number {
  let total = 0;
  for (const rel of walk(dir, '', [])) total += statSync(join(dir, rel)).size;
  return total;
}

function preflight(): void {
  const appDir = join(REPO, 'app');
  const shotDir = join(REPO, 'screenshots');
  if (!existsSync(appDir)) throw new Error('missing app/ directory');
  const appFiles = walk(appDir, '', []);
  if (appFiles.length > APP_MAX_FILES) {
    throw new Error(`app/ has ${appFiles.length} files, cap is ${APP_MAX_FILES}`);
  }
  const appBytes = byteSizeOf(appDir);
  if (appBytes > APP_MAX_BYTES) {
    throw new Error(`app/ is ${appBytes} bytes, cap is ${APP_MAX_BYTES}`);
  }
  if (!existsSync(shotDir)) throw new Error('missing screenshots/ directory');
  const shots = readdirSync(shotDir).filter((n) => /\.(jpe?g|png)$/i.test(n)).sort();
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`expected 3-4 screenshots, found ${shots.length}`);
  }
  for (const name of shots) {
    const size = statSync(join(shotDir, name)).size;
    if (size > SHOT_MAX_BYTES) {
      throw new Error(`screenshot ${name} is ${size} bytes, cap is ${SHOT_MAX_BYTES}`);
    }
  }
}

function main(): void {
  preflight();
  mkdirSync(OUT, { recursive: true });
  cpSync(join(REPO, 'app'), join(OUT, 'app'), { recursive: true });
  cpSync(join(REPO, 'screenshots'), join(OUT, 'screenshots'), { recursive: true });
  const dossier = buildDossier(REPO, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: SHOT_MAX_BYTES },
    app_max_files: APP_MAX_FILES,
    app_max_bytes: APP_MAX_BYTES,
  });
  if (dossier.length > DOSSIER_MAX_BYTES) {
    throw new Error('dossier.json exceeds its 1.5 MiB cap');
  }
  // buildDossier already returns canonical JSON bytes; write them as-is.
  writeFileSync(join(OUT, 'dossier.json'), dossier);
  const appFiles = walk(join(OUT, 'app'), '', []);
  const shotFiles = readdirSync(join(OUT, 'screenshots')).length;
  console.log(`handed in ${appFiles.length} app files (${byteSizeOf(join(OUT, 'app'))} bytes) and ${shotFiles} screenshots`);
  console.log(`dossier written to ${join(OUT, 'dossier.json')}`);
}

main();
