// Vice City Multi-Panel Studio — cover renderer (canvas 2D, no dependencies).
// Draws GTA-style multi-panel covers from user photos: panel layouts, a grade
// tint over the whole cover, procedural skyline + palms, bold Anton lettering
// and seeded film grain. The editor preview and the PNG export call the same
// drawComicCover, so what you see is exactly what you get.

export const GRADES = {
  sunset: {
    name: "Vice City Sunset",
    tintTop: "rgba(255,122,26,0.14)",
    tintBottom: "rgba(255,45,120,0.16)",
  },
  neon: {
    name: "Neon Nights",
    tintTop: "rgba(80,40,255,0.16)",
    tintBottom: "rgba(0,220,255,0.14)",
  },
  tropical: {
    name: "Tropical Heat",
    tintTop: "rgba(255,200,40,0.12)",
    tintBottom: "rgba(0,180,120,0.12)",
  },
  drama: {
    name: "Crime Drama",
    tintTop: "rgba(8,8,28,0.18)",
    tintBottom: "rgba(120,0,0,0.10)",
  },
};

export const LAYOUTS = {
  classic: { name: "Classic Vice", panels: (W, H) => [
    { x: 0, y: 0, w: W, h: H * 0.62 },
    { x: 0, y: H * 0.62, w: W / 2, h: H * 0.38 },
    { x: W / 2, y: H * 0.62, w: W / 2, h: H * 0.38 },
  ] },
  duo: { name: "Duo Story", panels: (W, H) => [
    { x: 0, y: 0, w: W / 2, h: H },
    { x: W / 2, y: 0, w: W / 2, h: H },
  ] },
  nights: { name: "City Nights", panels: (W, H) => [
    { x: 0, y: 0, w: W * 0.6, h: H },
    { x: W * 0.6, y: 0, w: W * 0.4, h: H / 2 },
    { x: W * 0.6, y: H / 2, w: W * 0.4, h: H / 2 },
  ] },
  grid: { name: "Action Grid", panels: (W, H) => [
    { x: 0, y: 0, w: W / 2, h: H / 2 },
    { x: W / 2, y: 0, w: W / 2, h: H / 2 },
    { x: 0, y: H / 2, w: W / 2, h: H / 2 },
    { x: W / 2, y: H / 2, w: W / 2, h: H / 2 },
  ] },
  sunset: { name: "Sunset Edition", panels: (W, H) => [
    { x: 0, y: 0, w: W, h: H },
  ] },
  minimal: { name: "Minimal Crime", panels: (W, H) => [
    { x: W * 0.05, y: H * 0.05, w: W * 0.9, h: H * 0.68 },
  ] },
};

export const DEFAULT_CROPS = [
  { cx: 0.5, cy: 0.5, zoom: 1, flip: false },
  { cx: 0.5, cy: 0.5, zoom: 1, flip: false },
  { cx: 0.62, cy: 0.28, zoom: 1.5, flip: false },
  { cx: 0.5, cy: 0.5, zoom: 1, flip: false },
];

export function layoutPanels(preset, W, H) {
  const layout = LAYOUTS[preset] || LAYOUTS.classic;
  return layout.panels(W, H);
}

// Deterministic PRNG so the grain and skyline look identical on every render.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cover-fit: fill the panel with the photo, never stretch it. The crop point
// (cx, cy) is the photo point that lands on the panel centre; zoom magnifies.
export function fitPhotoToPanel(ctx, img, panel, crop) {
  const c = crop || { cx: 0.5, cy: 0.5, zoom: 1, flip: false };
  const scale = Math.max(panel.w / img.width, panel.h / img.height) * (c.zoom || 1);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = panel.x + panel.w / 2 - c.cx * dw;
  const dy = panel.y + panel.h / 2 - c.cy * dh;
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  if (c.flip) {
    ctx.translate(panel.x + panel.w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(panel.x + panel.w / 2), 0);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawPanelFrame(ctx, panel, gutter) {
  ctx.save();
  ctx.strokeStyle = "#f5f0e6";
  ctx.lineWidth = Math.max(3, gutter * 0.7);
  ctx.strokeRect(panel.x + gutter / 2, panel.y + gutter / 2,
    panel.w - gutter, panel.h - gutter);
  ctx.restore();
}

function drawPlaceholder(ctx, panel, index) {
  const grad = ctx.createLinearGradient(panel.x, panel.y, panel.x, panel.y + panel.h);
  const hues = [330, 25, 200, 150, 280, 45];
  const hue = hues[index % hues.length];
  grad.addColorStop(0, `hsl(${hue}, 70%, 55%)`);
  grad.addColorStop(1, `hsl(${(hue + 40) % 360}, 75%, 30%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `bold ${Math.max(18, panel.h * 0.08)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`PHOTO ${index + 1}`, panel.x + panel.w / 2, panel.y + panel.h / 2);
}

export function drawCitySkyline(ctx, W, H, baseY, seed) {
  const rand = mulberry32(seed);
  ctx.save();
  ctx.fillStyle = "rgba(10,6,24,0.9)";
  let x = 0;
  while (x < W) {
    const bw = W * (0.05 + rand() * 0.09);
    const bh = H * (0.08 + rand() * 0.22);
    ctx.fillRect(x, baseY - bh, bw, bh);
    if (rand() > 0.5) {
      ctx.fillRect(x + bw * 0.3, baseY - bh - H * 0.03, bw * 0.15, H * 0.03);
    }
    ctx.fillStyle = "rgba(255,190,80,0.75)";
    for (let wy = baseY - bh + 6; wy < baseY - 8; wy += 14) {
      for (let wx = x + 6; wx < x + bw - 8; wx += 16) {
        if (rand() > 0.6) ctx.fillRect(wx, wy, 5, 7);
      }
    }
    ctx.fillStyle = "rgba(10,6,24,0.9)";
    x += bw + 2;
  }
  ctx.restore();
}

export function drawPalmSilhouette(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean || 0);
  ctx.strokeStyle = "rgba(8,5,20,0.95)";
  ctx.lineWidth = Math.max(3, s * 0.06);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.08, -s * 0.5, s * 0.22, -s * 0.85);
  ctx.stroke();
  ctx.fillStyle = "rgba(8,5,20,0.95)";
  const topX = s * 0.22;
  const topY = -s * 0.85;
  for (let i = 0; i < 7; i++) {
    const a = (-Math.PI * 0.15) - (i * Math.PI) / 8;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * s * 0.5, topY + Math.sin(a) * s * 0.28 + s * 0.12,
      topX + Math.cos(a) * s * 0.85, topY + Math.sin(a) * s * 0.5 + s * 0.3);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * s * 0.45, topY + Math.sin(a) * s * 0.42 + s * 0.1,
      topX, topY);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFilmGrain(ctx, W, H, seed) {
  const rand = mulberry32(seed);
  const count = Math.floor((W * H) / 900);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rand();
    ctx.fillStyle = v > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(rand() * W, rand() * H, 1.6, 1.6);
  }
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px AntonCover, "Arial Black", sans-serif`;
  while (size > 18 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px AntonCover, "Arial Black", sans-serif`;
  }
  return size;
}

export function renderCaptionLettering(ctx, W, H, title, subtitle, micro, position) {
  const cleanTitle = (title || "VICE CITY").toUpperCase().slice(0, 24);
  const cleanSub = (subtitle || "").toUpperCase().slice(0, 45);
  const cleanMicro = (micro || "").toUpperCase();
  const titleSize = fitFont(ctx, cleanTitle, W * 0.92, Math.floor(W * 0.11));
  let titleY;
  if (position === "top") titleY = H * 0.18;
  else if (position === "center") titleY = H * 0.5;
  else titleY = H * 0.8;

  const scrimH = titleSize * 2.6;
  const scrimY = position === "top" ? 0 : titleY - titleSize * 1.7;
  const scrim = ctx.createLinearGradient(0, scrimY, 0, scrimY + scrimH);
  if (position === "top") {
    scrim.addColorStop(0, "rgba(0,0,0,0.62)");
    scrim.addColorStop(1, "rgba(0,0,0,0)");
  } else {
    scrim.addColorStop(0, "rgba(0,0,0,0)");
    scrim.addColorStop(1, "rgba(0,0,0,0.62)");
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimY, W, scrimH);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = titleSize * 0.12;
  ctx.shadowOffsetY = titleSize * 0.05;

  if (cleanSub) {
    const subSize = Math.floor(titleSize * 0.34);
    ctx.font = `${subSize}px AntonCover, "Arial Black", sans-serif`;
    // Above the title, except at the top where it goes below it.
    const subY = position === "top"
      ? titleY + titleSize * 0.78
      : titleY - titleSize * 1.05;
    ctx.lineWidth = Math.max(2, subSize * 0.14);
    ctx.strokeStyle = "#14060a";
    ctx.strokeText(cleanSub, W / 2, subY);
    ctx.fillStyle = "#ffd23e";
    ctx.fillText(cleanSub, W / 2, subY);
  }

  ctx.font = `${titleSize}px AntonCover, "Arial Black", sans-serif`;
  ctx.lineWidth = Math.max(3, titleSize * 0.09);
  ctx.strokeStyle = "#160409";
  ctx.strokeText(cleanTitle, W / 2, titleY);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(cleanTitle, W / 2, titleY);

  if (cleanMicro) {
    const microSize = Math.floor(titleSize * 0.26);
    ctx.font = `${microSize}px AntonCover, "Arial Black", sans-serif`;
    ctx.lineWidth = Math.max(2, microSize * 0.14);
    ctx.strokeStyle = "#14060a";
    const microY = position === "top"
      ? titleY + titleSize * 1.3
      : titleY + titleSize * 0.62;
    ctx.strokeText(cleanMicro, W / 2, microY);
    ctx.fillStyle = "#ff8fb0";
    ctx.fillText(cleanMicro, W / 2, microY);
  }
  ctx.restore();
}

export function drawComicCover(canvas, opts) {
  const o = opts || {};
  const W = o.width || 1080;
  const H = o.height || 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const photos = o.photos || [];
  const panels = layoutPanels(o.layout || "classic", W, H);
  const gutter = Math.max(4, Math.floor(W * 0.006));

  ctx.fillStyle = "#0d0a14";
  ctx.fillRect(0, 0, W, H);

  panels.forEach((panel, i) => {
    const img = photos[i] || photos[0] || null;
    const crops = o.crops || DEFAULT_CROPS;
    if (img && img.width && img.height) {
      fitPhotoToPanel(ctx, img, panel, crops[i] || crops[0]);
    } else {
      drawPlaceholder(ctx, panel, i);
    }
  });

  // Skyline + palms across the bottom of the hero panel.
  const hero = panels[0];
  drawCitySkyline(ctx, W, H, hero.y + hero.h, 1337);
  drawPalmSilhouette(ctx, W * 0.06, hero.y + hero.h, H * 0.16, -0.08);
  drawPalmSilhouette(ctx, W * 0.94, hero.y + hero.h, H * 0.13, 0.1);

  panels.forEach((panel) => drawPanelFrame(ctx, panel, gutter));

  // One grade tint over the whole cover, so the panels read as one image.
  const grade = GRADES[o.grade || "sunset"] || GRADES.sunset;
  const tint = ctx.createLinearGradient(0, 0, 0, H);
  tint.addColorStop(0, grade.tintTop);
  tint.addColorStop(1, grade.tintBottom);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, W, H);

  renderCaptionLettering(ctx, W, H, o.title, o.subtitle, o.micro, o.position || "bottom");
  drawFilmGrain(ctx, W, H, 20261121);
  return canvas;
}

// Render a cover at an exact pixel size and return the canvas.
export function renderCoverPng(opts) {
  const canvas = document.createElement("canvas");
  return drawComicCover(canvas, opts);
}

export function exportCoverPng(opts) {
  const canvas = renderCoverPng(opts);
  return canvas.toDataURL("image/png");
}

export function exportPng1080(opts) {
  return exportCoverPng({ ...opts, width: 1080, height: 1080 });
}
