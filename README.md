# Vice City Multi-Panel Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Velixxyz/gta6-cover-art-r2/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Velixxyz/gta6-cover-art-r2/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Turn your photo and a caption into a multi-panel GTA-style poster cover —
a Vice City sunset grade, bold condensed lettering, skyline and palm
silhouettes — and export it as a PNG to share.

## How it works

1. **Add photos** — drop 1–10 photos from your machine (or load a sample).
   One photo fills every panel, cropped differently in each.
2. **Pick a layout** — 6 art-directed presets: Classic Vice, Duo Story,
   City Nights, Action Grid, Sunset Edition, Minimal Crime.
3. **Pick a grade** — Vice City Sunset, Neon Nights, Tropical Heat,
   Crime Drama. One grade applies to the whole poster.
4. **Write a caption** — big title (max 24 chars, auto-fit), subtitle,
   micro detail, top / centre / bottom position.
5. **Crop each panel** — click a panel, drag to pan, scroll to zoom,
   flip, double-click to reset. Crops are independent per panel.
6. **Export PNG** — 1080×1080, 1080×1350, 1920×1080, or all three at once.

The live preview and the exported PNG are drawn by the same code
(`app/src/coverRender.js`), so what you see is what you download.

## Run it

```bash
node serve.ts
# open http://localhost:8080
```

100% offline static files — no network requests, no upload, no build step.
Photos are read in your browser and never leave your machine.

## Original art only

Every visual is drawn in code: sunset gradients, skyline and palm
silhouettes, neon accents, film grain. No Rockstar logo, wordmark,
official artwork, character or font. Display face: **Anton**
(SIL Open Font License, bundled in `app/fonts/` with its license file).

Built for the [Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01)
competition on [make.fun](https://make.fun).
