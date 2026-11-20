// Vice City Multi-Panel Studio — cover renderer.
// One function draws every cover: the live preview and the exported PNG
// run through the exact same code, so what you see is what you download.
// All art is drawn in code: sunset gradients, skyline and palm silhouettes,
// neon accents, film grain. No Rockstar logo, artwork or font anywhere.

export const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const GRADES = {
  sunset: {
    label: 'Vice City Sunset',
    filter: 'saturate(1.3) contrast(1.07) brightness(1.03) sepia(0.14) hue-rotate(-8deg)',
    tintTop: 'rgba(255,122,26,0.14)',
    tintBottom: 'rgba(255,46,136,0.16)',
    accent: '#ff2e88',
    accent2: '#ffb347',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.18) brightness(0.98) hue-rotate(12deg)',
    tintTop: 'rgba(64,224,255,0.10)',
    tintBottom: 'rgba(150,40,255,0.16)',
    accent: '#27e6ff',
    accent2: '#ff2e88',
  },
  tropical: {
    label: 'Tropical Heat',
    filter: 'saturate(1.22) contrast(1.03) brightness(1.06) sepia(0.08)',
    tintTop: 'rgba(255,214,90,0.08)',
    tintBottom: 'rgba(32,178,170,0.08)',
    accent: '#ffd65a',
    accent2: '#2ec4b6',
  },
  crime: {
    label: 'Crime Drama',
    filter: 'saturate(0.82) contrast(1.12) brightness(0.95) sepia(0.18) hue-rotate(-12deg)',
    tintTop: 'rgba(255,176,66,0.07)',
    tintBottom: 'rgba(10,90,110,0.12)',
    accent: '#ffb042',
    accent2: '#0f7d8c',
  },
};

export const LAYOUTS = {
  classic: { label: 'Classic Vice', panels: 5 },
  duo: { label: 'Duo Story', panels: 5 },
  nights: { label: 'City Nights', panels: 4 },
  action: { label: 'Action Grid', panels: 6 },
  sunset: { label: 'Sunset Edition', panels: 4 },
  minimal: { label: 'Minimal Crime', panels: 3 },
};

// Panel rectangles as fractions of the canvas (x, y, w, h). The hero panel
// is always first. Fractions adapt to any export size, so a cover reflows
// instead of stretching when the size changes.
export function layoutPanels(preset, wide) {
  if (preset === 'classic') {
    return wide
      ? [[0, 0, 0.52, 1], [0.52, 0, 0.24, 0.5], [0.76, 0, 0.24, 0.5], [0.52, 0.5, 0.24, 0.5], [0.76, 0.5, 0.24, 0.5]]
      : [[0, 0, 0.58, 1], [0.58, 0, 0.21, 0.5], [0.79, 0, 0.21, 0.5], [0.58, 0.5, 0.21, 0.5], [0.79, 0.5, 0.21, 0.5]];
  }
  if (preset === 'duo') {
    return [[0, 0, 0.5, 0.58], [0.5, 0, 0.5, 0.58], [0, 0.58, 0.34, 0.42], [0.34, 0.58, 0.33, 0.42], [0.67, 0.58, 0.33, 0.42]];
  }
  if (preset === 'nights') {
    return [[0, 0, 1, 0.62], [0, 0.62, 0.34, 0.38], [0.34, 0.62, 0.33, 0.38], [0.67, 0.62, 0.33, 0.38]];
  }
  if (preset === 'action') {
    return [[0, 0, 0.55, 0.66], [0.55, 0, 0.45, 0.33], [0.55, 0.33, 0.45, 0.33], [0, 0.66, 0.34, 0.34], [0.34, 0.66, 0.33, 0.34], [0.67, 0.66, 0.33, 0.34]];
  }
  if (preset === 'sunset') {
    return wide
      ? [[0.42, 0, 0.58, 1], [0, 0, 0.42, 0.34], [0, 0.34, 0.42, 0.33], [0, 0.67, 0.42, 0.33]]
      : [[0, 0, 1, 0.58], [0, 0.58, 0.34, 0.42], [0.34, 0.58, 0.33, 0.42], [0.67, 0.58, 0.33, 0.42]];
  }
  // minimal
  return wide
    ? [[0, 0, 0.72, 1], [0.72, 0, 0.28, 0.5], [0.72, 0.5, 0.28, 0.5]]
    : [[0, 0, 1, 0.72], [0, 0.72, 0.5, 0.28], [0.5, 0.72, 0.5, 0.28]];
}

// Default crops so one photo fills every panel with a different framing:
// hero keeps the face high, the small panels zoom into details.
export const DEFAULT_CROPS = [
  { cx: 0.5, cy: 0.32, zoom: 1.0, flip: false },
  { cx: 0.28, cy: 0.3, zoom: 1.7, flip: false },
  { cx: 0.62, cy: 0.28, zoom: 1.5, flip: false },
  { cx: 0.5, cy: 0.62, zoom: 1.5, flip: false },
  { cx: 0.2, cy: 0.45, zoom: 1.8, flip: true },
  { cx: 0.82, cy: 0.3, zoom: 1.7, flip: false },
];

// Deterministic random: the same cover always renders the same grain.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function randomMulberry() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Draw one photo into one panel with the cover algorithm (never stretched):
// scale to cover, then pan by the panel's own crop focus. Each panel keeps
// its own crop, so changing one never moves the others.
export function fitPhotoToPanel(ctx, img, rect, crop) {
  const [px, py, pw, ph] = rect;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih || pw <= 0 || ph <= 0) return;
  const zoom = Math.max(1, crop.zoom || 1);
  const scale = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = px + (pw - dw) / 2 - (crop.cx - 0.5) * (dw - pw);
  let dy = py + (ph - dh) / 2 - (crop.cy - 0.5) * (dh - ph);
  dx = Math.min(px, Math.max(px + pw - dw, dx));
  dy = Math.min(py, Math.max(py + ph - dh, dy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  if (crop.flip) {
    ctx.translate(px + pw / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(px + pw / 2), 0);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawPalmSilhouette(ctx, x, baseY, height, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, height * 0.035);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + height * 0.08, baseY - height * 0.6, x + height * 0.02, baseY - height);
  ctx.stroke();
  const topX = x + height * 0.02;
  const topY = baseY - height;
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI * (0.08 + i * 0.16);
    const len = height * 0.42;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(angle) * len * 0.6, topY - Math.sin(angle) * len * 0.5 + height * 0.12,
      topX + Math.cos(angle) * len, topY - Math.sin(angle) * len * 0.45 + height * 0.22,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawCitySkyline(ctx, w, h, grade, seed) {
  const rand = mulberry32(seed);
  const baseY = h;
  const skyH = h * 0.085;
  ctx.save();
  ctx.fillStyle = 'rgba(12,6,24,0.92)';
  let x = 0;
  while (x < w) {
    const bw = w * (0.04 + rand() * 0.07);
    const bh = skyH * (0.45 + rand() * 0.55);
    ctx.fillRect(x, baseY - bh, bw, bh);
    if (rand() > 0.6) {
      ctx.fillRect(x + bw * 0.32, baseY - bh - skyH * 0.16, bw * 0.36, skyH * 0.16);
    }
    // Lit windows, a few warm dots in the dark towers.
    ctx.fillStyle = 'rgba(255,190,90,0.85)';
    const rows = Math.max(1, Math.floor(bh / (h * 0.018)));
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        if (rand() > 0.72) ctx.fillRect(x + bw * (0.18 + c * 0.28), baseY - bh + h * 0.012 + r * h * 0.018, Math.max(2, w * 0.004), Math.max(2, h * 0.006));
      }
    }
    ctx.fillStyle = 'rgba(12,6,24,0.92)';
    x += bw + w * 0.004;
  }
  drawPalmSilhouette(ctx, w * 0.045, baseY, skyH * 1.9, 'rgba(8,4,18,0.95)');
  drawPalmSilhouette(ctx, w * 0.955, baseY, skyH * 1.6, 'rgba(8,4,18,0.95)');
  // Neon horizon line on top of the skyline.
  ctx.fillStyle = grade.accent;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, baseY - skyH - 2, w, 2);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawFilmGrain(ctx, w, h, seed) {
  const rand = mulberry32(seed);
  const tile = document.createElement('canvas');
  tile.width = 128; tile.height = 128;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 22;
  }
  tctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.5;
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Bold caption lettering: condensed display face, dark outline, hard drop
// shadow, auto-fit so the title never overflows the canvas.
export function renderCaptionLettering(ctx, w, h, opts) {
  const grade = GRADES[opts.grade] || GRADES.sunset;
  const title = (opts.title || '').toUpperCase().slice(0, 24);
  const subtitle = (opts.subtitle || '').toUpperCase().slice(0, 45);
  const micro = opts.micro || '';
  const pos = opts.captionPos || 'bottom';
  const titleSize = fitTitleSize(ctx, title, w);
  const titleFont = `${titleSize}px AntonCover, Anton, 'Arial Narrow', sans-serif`;
  const margin = w * 0.05;
  let titleY;
  let scrimY; let scrimH;
  if (pos === 'top') {
    titleY = h * 0.16;
    scrimY = 0; scrimH = h * 0.26;
  } else if (pos === 'center') {
    titleY = h * 0.52;
    scrimY = h * 0.36; scrimH = h * 0.3;
  } else {
    titleY = h * 0.88;
    scrimY = h * 0.68; scrimH = h * 0.32;
  }
  // Scrim: a dark gradient so lettering stays readable on bright skies.
  const scrim = ctx.createLinearGradient(0, scrimY, 0, scrimY + scrimH);
  if (pos === 'top') {
    scrim.addColorStop(0, 'rgba(8,4,18,0.82)');
    scrim.addColorStop(1, 'rgba(8,4,18,0)');
  } else if (pos === 'center') {
    scrim.addColorStop(0, 'rgba(8,4,18,0)');
    scrim.addColorStop(0.5, 'rgba(8,4,18,0.72)');
    scrim.addColorStop(1, 'rgba(8,4,18,0)');
  } else {
    scrim.addColorStop(0, 'rgba(8,4,18,0)');
    scrim.addColorStop(1, 'rgba(8,4,18,0.85)');
  }
  ctx.save();
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimY, w, scrimH);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const subSize = Math.max(14, Math.round(titleSize * 0.26));
  // The subtitle sits clear of the title: above its cap height when the
  // title is at the bottom or centre, below its baseline when at the top.
  const subY = pos === 'top' ? titleY + titleSize * 0.55 : titleY - titleSize * 1.05;
  if (subtitle) {
    ctx.font = `600 ${subSize}px AntonCover, Anton, 'Arial Narrow', sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch (e) { /* older canvas: no letter spacing */ }
    ctx.lineWidth = Math.max(2, subSize * 0.12);
    ctx.strokeStyle = 'rgba(8,4,18,0.9)';
    ctx.fillStyle = grade.accent2;
    ctx.strokeText(subtitle, w / 2, subY);
    ctx.fillText(subtitle, w / 2, subY);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* ignore */ }
  }
  if (title) {
    ctx.font = titleFont;
    ctx.lineWidth = Math.max(3, titleSize * 0.13);
    ctx.strokeStyle = 'rgba(8,4,18,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = Math.round(titleSize * 0.08);
    ctx.shadowOffsetY = Math.round(titleSize * 0.05);
    ctx.fillStyle = '#fff3d6';
    ctx.strokeText(title, w / 2, titleY);
    ctx.fillText(title, w / 2, titleY);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }
  if (micro) {
    ctx.font = `600 ${Math.max(12, Math.round(titleSize * 0.16))}px AntonCover, Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(titleSize * 0.06)}px`; } catch (e) { /* ignore */ }
    ctx.fillStyle = 'rgba(255,243,214,0.85)';
    ctx.lineWidth = 0;
    const microY = pos === 'bottom' ? h * 0.965 : titleY + titleSize * 0.55;
    ctx.fillText(micro.toUpperCase().slice(0, 60), w / 2, microY);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* ignore */ }
  }
  ctx.restore();
  return { titleSize };
}

function fitTitleSize(ctx, title, w) {
  let size = Math.round(w * 0.115);
  const min = Math.round(w * 0.045);
  while (size > min) {
    ctx.font = `${size}px AntonCover, Anton, 'Arial Narrow', sans-serif`;
    if (ctx.measureText(title).width <= w * 0.92) break;
    size = Math.round(size * 0.92);
  }
  return size;
}

// The cover itself: panels, one global grade, skyline, caption.
export function drawComicCover(canvas, state) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  const photos = state.photos || [];
  const wide = w >= h;
  const rects = layoutPanels(state.layout || 'classic', wide);
  const gutter = Math.max(4, Math.round(Math.min(w, h) * 0.012));
  // Dark gutters: the canvas background shows between panels.
  ctx.save();
  ctx.fillStyle = '#0b0714';
  ctx.fillRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2b0f3d');
  sky.addColorStop(0.55, '#7a1e4d');
  sky.addColorStop(1, '#ff7a2a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const panels = state.panels && state.panels.length ? state.panels : rects.map((r, i) => ({
    photo: photos.length ? i % photos.length : -1,
    crop: DEFAULT_CROPS[i % DEFAULT_CROPS.length],
  }));
  rects.forEach((frac, i) => {
    const rect = [
      Math.round(frac[0] * w + gutter / 2),
      Math.round(frac[1] * h + gutter / 2),
      Math.round(frac[2] * w - gutter),
      Math.round(frac[3] * h - gutter),
    ];
    const panel = panels[i] || { photo: -1, crop: DEFAULT_CROPS[i % DEFAULT_CROPS.length] };
    const img = panel.photo >= 0 ? photos[panel.photo] : null;
    ctx.save();
    ctx.filter = grade.filter;
    if (img && img.complete && (img.naturalWidth || img.width)) {
      fitPhotoToPanel(ctx, img, rect, panel.crop || DEFAULT_CROPS[i % DEFAULT_CROPS.length]);
    } else {
      // Empty panel: a sunset gradient with a palm, never a black hole.
      const g = ctx.createLinearGradient(rect[0], rect[1], rect[0], rect[1] + rect[3]);
      g.addColorStop(0, '#ff9a3d');
      g.addColorStop(1, '#c22a7a');
      ctx.fillStyle = g;
      ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
      drawPalmSilhouette(ctx, rect[0] + rect[2] * 0.3, rect[1] + rect[3], rect[3] * 0.5, 'rgba(20,8,32,0.85)');
    }
    ctx.restore();
    // Thin neon edge on the hero panel only.
    if (i === 0) {
      ctx.save();
      ctx.strokeStyle = grade.accent;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.004));
      ctx.strokeRect(rect[0] + 1, rect[1] + 1, rect[2] - 2, rect[3] - 2);
      ctx.restore();
    }
  });
  // One global grade tint over every panel, so the panels read as one poster.
  const tint = ctx.createLinearGradient(0, 0, 0, h);
  tint.addColorStop(0, grade.tintTop);
  tint.addColorStop(1, grade.tintBottom);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // Vignette, very light.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(8,4,18,0)');
  vig.addColorStop(1, 'rgba(8,4,18,0.28)');
  ctx.save();
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  drawFilmGrain(ctx, w, h, 20261120);
  drawCitySkyline(ctx, w, h, grade, 7);
  renderCaptionLettering(ctx, w, h, state);
  return canvas;
}

// Render a cover at a full export size and hand back a PNG blob.
export function exportCoverPng(state, sizeName) {
  const [w, h] = EXPORT_SIZES[sizeName] || EXPORT_SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawComicCover(canvas, state);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export function exportPng1080(state) {
  return exportCoverPng(state, '1080x1080');
}
