# Vice City Multi-Panel Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

[![rank](https://make.fun/badge/gta6-cover-art-01/Velixxyz/gta6-cover-art-r2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

[![reward](https://make.fun/badge/gta6-cover-art-01/Velixxyz/gta6-cover-art-r2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A multi-panel GTA-style cover maker that runs entirely in the browser. Drop in
your own photos, pick a layout and a colour grade, set the caption, and export a
poster-ready PNG — no upload, no account, no network.

## What it does

- **6 layouts** — Classic Vice, Duo Story, City Nights, Action Grid, Sunset
  Edition, Minimal Crime. One photo can fill every panel, or each panel can
  carry its own.
- **4 grades** — Vice City Sunset, Neon Nights, Tropical Heat, Crime Drama.
  One global tint washes across the whole cover.
- **1–10 local photos** — file picker or drag-and-drop, with thumbnails. Every
  panel crops cover-fit, never stretched: click a panel to select it, drag to
  pan, scroll to zoom, flip it, double-click to reset.
- **Caption** — a bold Anton title (outline plus shadow, auto-fit, max 24
  characters), a subtitle (max 45), and a micro line, placed bottom, top or
  middle over a scrim.
- **Artwork** — a procedural city skyline with lit windows, palm silhouettes
  and seeded film grain, drawn fresh for every cover.
- **Export** — PNG at 1080×1080, 1080×1350 or 1920×1080, or all three at once.
  The editor preview uses the exact same renderer as the export.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in a browser. Everything runs locally; the
app loads no network resources at all.

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
