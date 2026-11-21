// Vice City Multi-Panel Studio — cover renderer (canvas 2D, no network).
// Draws a multi-panel GTA-style poster cover from photos + a caption, and
// exports it as PNG. The editor preview and the export share this code.

export const GRADES = {
  sunset: {
    label: 'Vice City Sunset',
    sky: ['#1d0b38', '#7b2d8b', '#ff7e47', '#ffc46b'],
    tint: 'rgba(255, 110, 60, 0.20)',
    tintMode: 'overlay',
    accent: '#ffb347',
    window: '#ffd76a',
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#05030f', '#1b0f4b', '#a4138e', '#00e5ff'],
    tint: 'rgba(0, 229, 255, 0.24)',
    tintMode: 'overlay',
    accent: '#00e5ff',
    window: '#7df9ff',
  },
  tropical: {
    label: 'Tropical Heat',
    sky: ['#062a22', '#0f7a5c', '#f2c14e', '#ff8f5c'],
    tint: 'rgba(255, 190, 60, 0.18)',
    tintMode: 'soft-light',
    accent: '#ffe066',
    window: '#fff3b0',
  },
  crime: {
    label: 'Crime Drama',
    sky: ['#0a0a0c', '#3a0d16', '#8c1d2f', '#e8b4b8'],
    tint: 'rgba(190, 30, 50, 0.16)',
    tintMode: 'overlay',
    accent: '#ff4d5e',
    window: '#ffb3ab',
  },
};

export const LAYOUTS = {
  classic: { label: 'Classic Vice', panels: 4 },
  duo: { label: 'Duo Story', panels: 2 },
  city: { label: 'City Nights', panels: 4 },
  grid: { label: 'Action Grid', panels: 4 },
  sunset: { label: 'Sunset Edition', panels: 3 },
  minimal: { label: 'Minimal Crime', panels: 1 },
};

// Deterministic pseudo-random generator so the skyline and grain look the
// same on every render of the same cover.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Panel rectangles for a layout, in pixels, with a gutter between panels.
export function layoutPanels(layout, w, h, gutter = 10) {
  const g = Math.max(2, Math.round(gutter));
  const rects = {
    classic: [
      [0, 0, 0.64, 0.66],
      [0.66, 0, 0.34, 0.32],
      [0.66, 0.34, 0.34, 0.32],
      [0, 0.68, 1, 0.32],
    ],
    duo: [
      [0, 0, 0.49, 1],
      [0.51, 0, 0.49, 1],
    ],
    city: [
      [0, 0, 1, 0.6],
      [0, 0.63, 0.32, 0.37],
      [0.34, 0.63, 0.32, 0.37],
      [0.68, 0.63, 0.32, 0.37],
    ],
    grid: [
      [0, 0, 0.49, 0.49],
      [0.51, 0, 0.49, 0.49],
      [0, 0.51, 0.49, 0.49],
      [0.51, 0.51, 0.49, 0.49],
    ],
    sunset: [
      [0, 0, 0.68, 1],
      [0.7, 0, 0.3, 0.48],
      [0.7, 0.52, 0.3, 0.48],
    ],
    minimal: [[0, 0, 1, 1]],
  };
  const list = rects[layout] ?? rects.classic;
  return list.map(([fx, fy, fw, fh]) => ({
    x: Math.round(fx * w) + g / 2,
    y: Math.round(fy * h) + g / 2,
    w: Math.round(fw * w) - g,
    h: Math.round(fh * h) - g,
  }));
}

export function defaultCrop() {
  return { scale: 1, ox: 0, oy: 0, flip: false };
}

export function makeDefaultState() {
  return {
    layout: 'classic',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'A Vice City story in four panels',
    micro: 'VICE CITY  •  EST. 1986',
    captionPos: 'bottom',
    photos: [],
    panelPhotos: [0, 0, 0, 0],
    crops: [defaultCrop(), defaultCrop(), defaultCrop(), defaultCrop()],
    seed: 20261121,
  };
}

// Draw one photo into a panel, cover-fit (never stretched), with pan/zoom/flip.
export function fitPhotoToPanel(ctx, img, rect, crop) {
  if (!img || !img.naturalWidth) return false;
  const c = crop ?? defaultCrop();
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * Math.max(0.2, c.scale);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  // Faces usually sit near the top of a photo: when the user has not panned
  // vertically yet and the photo is taller than the panel, favour the top of
  // the photo by a fifth of the cropped-away height instead of centring.
  const topBias = c.oy === 0 && dh > rect.h ? (dh - rect.h) * 0.2 : 0;
  const cx = rect.x + rect.w / 2 + c.ox;
  const cy = rect.y + rect.h / 2 + c.oy + topBias;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.translate(cx, cy);
  if (c.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  return true;
}

// Procedural city skyline silhouette with lit windows, drawn in a band.
export function drawCitySkyline(ctx, x, y, w, h, seed, windowColor) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.fillStyle = 'rgba(8, 4, 18, 0.92)';
  let bx = x;
  while (bx < x + w - 8) {
    const bw = 14 + rnd() * (w * 0.09);
    const bh = h * (0.35 + rnd() * 0.6);
    const by = y + h - bh;
    ctx.fillRect(bx, by, bw, bh);
    if (rnd() < 0.3) {
      ctx.fillRect(bx + bw * 0.42, by - h * 0.08, 2, h * 0.08);
      ctx.beginPath();
      ctx.arc(bx + bw * 0.43, by - h * 0.09, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ff5a5a';
      ctx.fill();
      ctx.fillStyle = 'rgba(8, 4, 18, 0.92)';
    }
    const cols = Math.max(1, Math.floor(bw / 12));
    const rows = Math.max(1, Math.floor(bh / 16));
    ctx.fillStyle = windowColor;
    for (let r = 0; r < rows; r += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (rnd() < 0.34) {
          ctx.globalAlpha = 0.5 + rnd() * 0.5;
          ctx.fillRect(bx + 4 + col * 12, by + 6 + r * 16, 5, 7);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(8, 4, 18, 0.92)';
    bx += bw + 2 + rnd() * 6;
  }
  ctx.restore();
}

// One palm tree silhouette: curved trunk and drooping fronds.
export function drawPalmSilhouette(ctx, x, y, size, lean, seed) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(6, 3, 14, 0.95)';
  ctx.fillStyle = 'rgba(6, 3, 14, 0.95)';
  ctx.lineCap = 'round';
  const topX = lean * size * 0.35;
  const topY = -size;
  ctx.lineWidth = Math.max(3, size * 0.045);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * size * 0.12, -size * 0.55, topX, topY);
  ctx.stroke();
  const fronds = 7;
  for (let i = 0; i < fronds; i += 1) {
    const angle = (-Math.PI * (0.08 + (i / fronds) * 0.84)) + (rnd() - 0.5) * 0.2;
    const len = size * (0.42 + rnd() * 0.22);
    const fx = topX + Math.cos(angle) * len;
    const fy = topY + Math.sin(angle) * len * 0.55 + len * 0.22;
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(angle) * len * 0.5,
      topY + Math.sin(angle) * len * 0.35 - len * 0.12,
      fx,
      fy,
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(topX, topY, size * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Seeded deterministic film grain: faint speckles over the whole cover.
export function drawFilmGrain(ctx, w, h, seed, amount = 0.05) {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const dots = Math.floor(((w * h) / 260) * amount * 20);
  ctx.save();
  for (let i = 0; i < dots; i += 1) {
    const v = rnd();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
  }
  ctx.restore();
}

function fitFontSize(ctx, text, maxWidth, startSize, minSize, family) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `400 ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minSize;
}

// Bold outlined caption lettering with a scrim underneath the text block.
export function renderCaptionLettering(ctx, opts, w, h) {
  const title = (opts.title ?? '').toUpperCase().slice(0, 24);
  const subtitle = (opts.subtitle ?? '').slice(0, 45);
  const micro = opts.micro ?? '';
  const pos = opts.captionPos ?? 'bottom';
  const family = '"AntonCover", "Arial Black", sans-serif';
  const margin = Math.round(w * 0.045);

  const titleSize = fitFontSize(ctx, title || ' ', w - margin * 2, Math.round(w * 0.105), 22, family);
  const subSize = Math.max(15, Math.round(w * 0.026));
  const microSize = Math.max(12, Math.round(w * 0.018));
  const gap = Math.round(titleSize * 0.22);
  const blockH = titleSize + gap + subSize + Math.round(gap * 0.8) + microSize + Math.round(titleSize * 0.5);
  let top;
  if (pos === 'top') top = Math.round(h * 0.045);
  else if (pos === 'middle') top = Math.round((h - blockH) / 2);
  else top = Math.round(h - blockH - h * 0.04);

  ctx.save();
  const scrim = ctx.createLinearGradient(0, top - titleSize * 0.35, 0, top + blockH + titleSize * 0.2);
  if (pos === 'top') {
    scrim.addColorStop(0, 'rgba(5,2,12,0.82)');
    scrim.addColorStop(1, 'rgba(5,2,12,0)');
  } else if (pos === 'middle') {
    scrim.addColorStop(0, 'rgba(5,2,12,0)');
    scrim.addColorStop(0.5, 'rgba(5,2,12,0.78)');
    scrim.addColorStop(1, 'rgba(5,2,12,0)');
  } else {
    scrim.addColorStop(0, 'rgba(5,2,12,0)');
    scrim.addColorStop(1, 'rgba(5,2,12,0.85)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, top - titleSize * 0.35, w, blockH + titleSize * 0.55);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let y = top + titleSize;
  if (title) {
    ctx.font = `400 ${titleSize}px ${family}`;
    try { ctx.letterSpacing = '2px'; } catch (e) { /* older canvas */ }
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = Math.round(titleSize * 0.14);
    ctx.shadowOffsetY = Math.round(titleSize * 0.06);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10,4,20,0.95)';
    ctx.lineWidth = Math.max(3, Math.round(titleSize / 11));
    ctx.strokeText(title, margin, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, margin, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  y += gap + subSize;
  if (subtitle) {
    ctx.font = `700 ${subSize}px Arial, sans-serif`;
    try { ctx.letterSpacing = '1px'; } catch (e) { /* older canvas */ }
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.fillText(subtitle, margin, y);
  }
  y += Math.round(gap * 0.8) + microSize;
  if (micro) {
    ctx.font = `700 ${microSize}px Arial, sans-serif`;
    try { ctx.letterSpacing = '3px'; } catch (e) { /* older canvas */ }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(micro.toUpperCase(), margin, y);
  }
  ctx.restore();
}

// The full cover: sky gradient, photo panels, skyline + palms, grade, grain,
// caption. Same function for the live preview and the PNG export.
export function drawComicCover(ctx, state, w, h) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const seed = (state.seed ?? 1) + hashSeed(`${state.layout}|${state.title}`);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  grade.sky.forEach((color, i) => sky.addColorStop(i / (grade.sky.length - 1), color));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const panels = layoutPanels(state.layout, w, h, Math.round(w * 0.009));
  panels.forEach((rect, i) => {
    const photoIndex = state.panelPhotos?.[i] ?? 0;
    const img = state.photos?.[photoIndex]?.img ?? null;
    const drawn = img ? fitPhotoToPanel(ctx, img, rect, state.crops?.[i]) : false;
    if (!drawn) {
      const g2 = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g2.addColorStop(0, '#3b1d5e');
      g2.addColorStop(1, '#12081f');
      ctx.fillStyle = g2;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, Math.round(w * 0.003));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  const bandH = Math.round(h * 0.2);
  drawCitySkyline(ctx, 0, h - bandH, w, bandH, seed, grade.window);
  const palmSize = Math.round(h * 0.16);
  drawPalmSilhouette(ctx, Math.round(w * 0.045), h - Math.round(bandH * 0.12), palmSize, -0.4, seed + 7);
  drawPalmSilhouette(ctx, Math.round(w * 0.955), h - Math.round(bandH * 0.12), Math.round(palmSize * 0.85), 0.4, seed + 21);

  ctx.save();
  ctx.globalCompositeOperation = grade.tintMode;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  drawFilmGrain(ctx, w, h, seed, 0.05);
  renderCaptionLettering(ctx, state, w, h);
  return panels;
}

// Render a cover to a fresh canvas at the requested pixel size.
export function exportCoverPng(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawComicCover(ctx, state, width, height);
  return canvas;
}

export function exportPng1080(state) {
  return exportCoverPng(state, 1080, 1080);
}

// Download the rendered cover as a PNG file (browser only).
export function downloadCoverPng(state, width, height, filename) {
  const canvas = exportCoverPng(state, width, height);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
}
