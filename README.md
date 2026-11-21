# Vice City Multi-Panel Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Velixxyz/gta6-cover-art-r2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Velixxyz/gta6-cover-art-r2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A web app that turns your photos into GTA-style multi-panel poster cover art,
in the spirit of the Vice City sunset and neon posters. Everything runs offline
in the browser: photos never leave your machine.

## What it does

- **Any photo, any panel** — add 1–10 photos from your machine (or drop them on
  the preview). One photo can fill every panel, or each panel can hold its own.
- **Crop per panel** — click a panel to select it, drag to pan, scroll to zoom,
  flip it, or double-click to reset the crop. Cover-fit, never stretched.
- **6 layouts** — Classic Vice, Duo Story, City Nights, Action Grid, Sunset
  Edition, Minimal Crime.
- **4 grades** — Vice City Sunset, Neon Nights, Tropical Heat, Crime Drama: one
  global tint across all panels.
- **Bold caption lettering** — a title (max 24 characters) in Anton with outline
  and shadow, a subtitle (max 45), and a micro line, placed at the bottom, top,
  or middle over a scrim.
- **Procedural art** — a generated city skyline with lit windows, palm
  silhouettes, and seeded deterministic film grain on every cover.
- **Export PNG** — 1080 × 1080, 1080 × 1350, 1920 × 1080, or all three at once.
  The preview and the export use the same renderer, so what you see is what
  the PNG holds.
- **Undo / redo / reset** — every edit is on the history stack.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node ../kit27/gta6-cover-art-01-kit/cli/makefun.mjs check --kit ../kit27/gta6-cover-art-01-kit --repo .
```

## Credits

- Samples `app/samples/pier.jpg` and `app/samples/boulevard.jpg` were made with
  an image model for this entry.
- Font: Anton by the Anton Project Authors, licensed under the SIL Open Font
  License 1.1 — see `app/fonts/OFL.txt`.
- No Rockstar Games logo, wordmark, artwork, or font is used anywhere.
- License: MIT — see `LICENSE`.
