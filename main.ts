// Vice City Multi-Panel Studio — entry build program (Node, standard library only).
// Copies app/ and screenshots/ beside this file into the output directory and
// writes dossier.json there with the vendored make.fun library.
// Run: MAKEFUN_OUTPUT_DIR=out node main.ts   (defaults to /output in the grader)
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Scorer caps from the bounty's gate: 4 screenshots max, 256 KiB each;
// app/ at most 993 files / 48 MiB total, paths under 1000 bytes.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function walk(dir, rel) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, entry.name);
    const r = rel ? rel + '/' + entry.name : entry.name;
    if (entry.isDirectory()) found.push(...walk(p, r));
    else if (entry.isFile()) found.push({ path: p, rel: r, bytes: statSync(p).size });
  }
  return found;
}

function preflight() {
  const appDir = join(here, 'app');
  if (!existsSync(appDir) || !statSync(appDir).isDirectory()) {
    throw new Error('preflight: app/ is missing — nothing to hand in');
  }
  const appFiles = walk(appDir, '');
  const appBytes = appFiles.reduce((n, f) => n + f.bytes, 0);
  if (appFiles.length > CAPS.app_max_files) {
    throw new Error(`preflight: app/ holds ${appFiles.length} files, over the ${CAPS.app_max_files} cap`);
  }
  if (appBytes > CAPS.app_max_bytes) {
    throw new Error(`preflight: app/ holds ${appBytes} bytes, over the ${CAPS.app_max_bytes} cap`);
  }
  const long = appFiles.find((f) => Buffer.byteLength('app/' + f.rel) > CAPS.app_path_max_bytes);
  if (long) throw new Error(`preflight: app path too long: app/${long.rel}`);

  const shotsDir = join(here, 'screenshots');
  const shots = existsSync(shotsDir) ? walk(shotsDir, '').filter((f) => /\.(jpe?g|png)$/i.test(f.rel)) : [];
  if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
    throw new Error(`preflight: ${shots.length} screenshots, need 3–${CAPS.screenshots.max}`);
  }
  for (const s of shots) {
    if (s.bytes > CAPS.screenshots.max_bytes) {
      throw new Error(`preflight: screenshot ${s.rel} is ${s.bytes} bytes, over 256 KiB`);
    }
  }
  return { appFiles: appFiles.length, appBytes, shots: shots.length };
}

const check = preflight();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// buildDossier returns canonical JSON bytes; write them raw, untouched.
const dossier = buildDossier(out, CAPS);
writeFileSync(join(out, 'dossier.json'), dossier);
if (dossier.length > 4 * 1024 * 1024) {
  throw new Error(`dossier is ${dossier.length} bytes, over the 4 MiB limit`);
}

// Self-check: the hand-in must mirror the source exactly.
const outApp = walk(join(out, 'app'), '');
const outBytes = outApp.reduce((n, f) => n + f.bytes, 0);
if (outApp.length !== check.appFiles || outBytes !== check.appBytes) {
  throw new Error(`hand-in mismatch: ${outApp.length} files / ${outBytes} bytes in output vs ${check.appFiles} / ${check.appBytes} in source`);
}

console.log(`handed in ${check.appFiles} app files (${check.appBytes} bytes) and ${check.shots} screenshots`);
console.log(`dossier written to ${join(out, 'dossier.json')} (${dossier.length} bytes)`);
