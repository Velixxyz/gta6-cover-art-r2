// Vice City Multi-Panel Studio — entrypoint (Node 22, stdlib only).
// Copies app/ and screenshots/ to MAKEFUN_OUTPUT_DIR and writes dossier.json
// (makefun/dossier/v1) holding the four entry screenshots, cover first.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR || join(ROOT, "out");

const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 48 * 1024 * 1024;
const SHOT_MAX_BYTES = 256 * 1024;
const DOSSIER_MAX_BYTES = 1536 * 1024;

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function listFiles(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, join(base, entry.name)));
    else if (entry.isFile()) out.push(join(base, entry.name));
  }
  return out.sort();
}

function buildDossier(): void {
  const appDir = join(ROOT, "app");
  const shotDir = join(ROOT, "screenshots");
  const appFiles = listFiles(appDir, "app");
  let appBytes = 0;
  for (const rel of appFiles) appBytes += statSync(join(ROOT, rel)).size;
  if (appFiles.length > APP_MAX_FILES) throw new Error(`app has ${appFiles.length} files (cap ${APP_MAX_FILES})`);
  if (appBytes > APP_MAX_BYTES) throw new Error(`app is ${appBytes} bytes (cap ${APP_MAX_BYTES})`);

  const shotNames = readdirSync(shotDir).filter((n) => n.endsWith(".jpg")).sort();
  if (shotNames.length === 0) throw new Error("no screenshots found");
  const images = shotNames.map((name) => {
    const bytes = readFileSync(join(shotDir, name));
    if (bytes.length > SHOT_MAX_BYTES) throw new Error(`${name} is ${bytes.length} bytes (cap ${SHOT_MAX_BYTES})`);
    return {
      name,
      media_type: "image/jpeg",
      sha256: sha256(bytes),
      base64: bytes.toString("base64"),
    };
  });

  const dossier = {
    schema: "makefun/dossier/v1",
    cover: 0,
    text: "Vice City Multi-Panel Studio: turn your own photos into a postable GTA-style multi-panel cover. Six panel layouts, four grades (Vice City Sunset, Neon Nights, Tropical Heat, Crime Drama), per-panel crop by drag and zoom, bold Anton caption lettering with subtitle and micro line, procedural skyline and palms, seeded film grain. One photo or several across the panels; export PNG at 1080x1080, 1080x1350 and 1920x1080. Preview and export share one renderer.",
    images,
  };
  const json = JSON.stringify(dossier);
  if (Buffer.byteLength(json) > DOSSIER_MAX_BYTES) throw new Error(`dossier.json is ${json.length} bytes (cap ${DOSSIER_MAX_BYTES})`);
  writeFileSync(join(OUT, "dossier.json"), json);
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  if (!existsSync(join(ROOT, "app"))) throw new Error("app/ is missing");
  if (!existsSync(join(ROOT, "screenshots"))) throw new Error("screenshots/ is missing");
  cpSync(join(ROOT, "app"), join(OUT, "app"), { recursive: true });
  cpSync(join(ROOT, "screenshots"), join(OUT, "screenshots"), { recursive: true });
  buildDossier();
  console.log(`built ${OUT}`);
}

main();
