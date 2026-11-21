# Vice City Multi-Panel Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

[![rank](https://make.fun/badge/gta6-cover-art-01/Velixxyz/gta6-cover-art-r2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

[![reward](https://make.fun/badge/gta6-cover-art-01/Velixxyz/gta6-cover-art-r2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A multi-panel GTA-style cover maker that runs entirely in the browser. Drop in
your own photos, pick a layout and a colour grade, write a punchy caption, and
export a poster-ready PNG.

## What it does

- Six comic-panel layouts: Classic Vice, Duo Story, City Nights, Action Grid,
  Sunset Edition, Minimal Crime.
- Four one-click grades: Vice City Sunset, Neon Nights, Tropical Heat, Crime Drama.
- One to ten local photos with drag-drop and thumbnails; one photo can fill
  every panel.
- Per-panel crop: click a panel, drag to pan, scroll to zoom, flip, reset, or
  double-click to reset. Photos always cover-fit, never stretch.
- Captions with big Anton lettering, outline and shadow, auto-fit, plus a
  subtitle and a micro line, placed at the bottom, top, or middle.
- Procedural city skyline and palm silhouettes with seeded deterministic film
  grain, drawn over every cover.
- Export PNG at 1080×1080, 1080×1350, 1920×1080, or all three sizes at once.
  The editor preview uses the exact same renderer as the export.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in a browser. Everything runs locally;
the app loads no network resources at all.

## Build the entry

```sh
node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output directory and
writes `dossier.json`. Set `MAKEFUN_OUTPUT_DIR` to choose where it goes.

## Files

- `app/index.html`, `app/style.css` — the editor shell and styling.
- `app/src/coverRender.js` — the canvas renderer: panels, grades, skyline,
  palms, grain, caption lettering, PNG export.
- `app/src/studio.js` — the editor: photos, layouts, grades, captions, crop,
  undo/redo, export.
- `app/src/shots.js` — screenshot scenes behind `?shot=cover` and
  `?shot=editor`.
- `app/samples/` — two sample photos made with an image model for this entry.
- `app/fonts/Anton-Regular.ttf` — Anton, under the SIL Open Font License 1.1
  (see `app/fonts/OFL.txt`).

No Rockstar logo, wordmark, artwork, or font is used anywhere in this project.
