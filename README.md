# Vice City Multi-Panel Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Velixxyz/gta6-cover-art-r2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Velixxyz/gta6-cover-art-r2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your own photos into a postable GTA-style multi-panel cover in a few steps.

## How it works

1. **Drop your photos** (1–10, they never leave your browser) or try a sample.
2. **Pick a layout** — six presets: Classic Vice, Duo Story, City Nights, Action Grid, Sunset Edition, Minimal Crime.
3. **Pick a grade** — Vice City Sunset, Neon Nights, Tropical Heat, Crime Drama. One tint covers the whole cover so the panels read as one image.
4. **Crop each panel** — click a panel to select it, drag to move the photo, scroll to zoom, double-click to reset, or flip it. One photo can fill every panel.
5. **Write the caption** — bold Anton title (auto-fits), subtitle and micro line, top / center / bottom.
6. **Export PNG** — 1080×1080, 1080×1350, 1920×1080, or all three at once.

The preview and the export share one renderer (`app/src/coverRender.js`), so the PNG matches exactly what you see. The cover also gets a procedural city skyline with lit windows, palm silhouettes and seeded film grain.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Build the entry

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` is stdlib-only Node 22: it copies `app/` and `screenshots/` to the output directory and writes `dossier.json` (makefun/dossier/v1) with the four screenshots, cover first.

## Fonts

Anton Regular (SIL Open Font License 1.1) is bundled in `app/fonts/` with its license text. No Rockstar logo, wordmark, artwork or font is used anywhere.
