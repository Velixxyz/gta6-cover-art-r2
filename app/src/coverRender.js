// Vice City Multi-Panel Studio — canvas cover renderer.
// Written fresh in this session. No network, no dependencies: plain canvas 2D.
(function (global) {
  'use strict';

  // Deterministic RNG so every render of the same state is identical.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Four colour grades. Each tints the whole cover and sets the skyline palette.
  const GRADES = {
    sunset: {
      label: 'Vice City Sunset',
      tint: 'rgba(255, 94, 20, 0.16)',
      warm: 'rgba(255, 170, 60, 0.10)',
      skyTop: '#2b1055', skyBottom: '#ff7e2a',
      accent: '#ffd23f', window: '#ffe9a8'
    },
    neon: {
      label: 'Neon Nights',
      tint: 'rgba(255, 0, 160, 0.14)',
      warm: 'rgba(0, 229, 255, 0.10)',
      skyTop: '#0b0033', skyBottom: '#ff2e88',
      accent: '#00e5ff', window: '#7df9ff'
    },
    tropical: {
      label: 'Tropical Heat',
      tint: 'rgba(0, 200, 120, 0.12)',
      warm: 'rgba(255, 210, 63, 0.12)',
      skyTop: '#003d5c', skyBottom: '#ffb03a',
      accent: '#ffe14d', window: '#fff3b0'
    },
    crime: {
      label: 'Crime Drama',
      tint: 'rgba(20, 20, 40, 0.22)',
      warm: 'rgba(180, 30, 30, 0.10)',
      skyTop: '#0a0a14', skyBottom: '#5c1a1a',
      accent: '#e8e8e8', window: '#ffd27d'
    }
  };

  // Six panel layouts. Rects are normalized (0..1); layoutPanels converts to px.
  function layoutPanels(kind, W, H) {
    const g = 5; // gutter px
    const norm = {
      classic: [
        { x: 0, y: 0, w: 0.66, h: 1 },
        { x: 0.66, y: 0, w: 0.34, h: 0.5 },
        { x: 0.66, y: 0.5, w: 0.34, h: 0.5 }
      ],
      duo: [
        { x: 0, y: 0, w: 0.5, h: 1 },
        { x: 0.5, y: 0, w: 0.5, h: 1 }
      ],
      city: [
        { x: 0, y: 0, w: 1, h: 0.62 },
        { x: 0, y: 0.62, w: 0.5, h: 0.38 },
        { x: 0.5, y: 0.62, w: 0.5, h: 0.38 }
      ],
      grid: [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
      ],
      sunset: [
        { x: 0, y: 0, w: 1, h: 1 }
      ],
      minimal: [
        { x: 0, y: 0, w: 1, h: 0.72 },
        { x: 0, y: 0.72, w: 1, h: 0.28 }
      ]
    }[kind] || [
      { x: 0, y: 0, w: 0.66, h: 1 },
      { x: 0.66, y: 0, w: 0.34, h: 0.5 },
      { x: 0.66, y: 0.5, w: 0.34, h: 0.5 }
    ];
    return norm.map(function (r) {
      return {
        x: Math.round(r.x * W) + g,
        y: Math.round(r.y * H) + g,
        w: Math.round(r.w * W) - g * 2,
        h: Math.round(r.h * H) - g * 2
      };
    });
  }

  function defaultCrop() {
    // Focus point biased toward the top third so faces are not cropped out.
    return { cx: 0.5, cy: 0.35, scale: 1, flip: false };
  }

  function makeDefaultState() {
    return {
      layout: 'classic',
      grade: 'sunset',
      title: 'SUNSET HEIST',
      subtitle: 'A Vice City story in four panels',
      micro: 'VICE CITY · EST. 1986',
      captionPos: 'bottom',
      selected: 0,
      photos: [],
      crops: {}
    };
  }

  // Photos for the panels: rotate the list so the selected photo leads the hero panel.
  function panelPhotos(state) {
    const list = state.photos || [];
    if (!list.length) return [];
    const start = ((state.selected || 0) % list.length + list.length) % list.length;
    const out = [];
    for (let i = 0; i < list.length; i++) out.push(list[(start + i) % list.length]);
    return out;
  }

  // Cover-fit an image into a panel, honouring the per-panel crop.
  // The focus point is pulled toward the panel centre, but the draw offset
  // is clamped to the image's slack so the photo always covers the panel
  // edge to edge (no dark band where the photo runs short).
  function fitPhotoToPanel(ctx, img, panel, crop) {
    const c = crop || defaultCrop();
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const s = Math.max(panel.w / iw, panel.h / ih) * c.scale;
    const dw = iw * s, dh = ih * s;
    const slackX = Math.max(0, dw - panel.w);
    const slackY = Math.max(0, dh - panel.h);
    let dx = panel.x + panel.w / 2 - c.cx * dw;
    let dy = panel.y + panel.h / 2 - c.cy * dh;
    dx = Math.min(panel.x, Math.max(panel.x - slackX, dx));
    dy = Math.min(panel.y, Math.max(panel.y - slackY, dy));
    ctx.save();
    ctx.beginPath();
    ctx.rect(panel.x, panel.y, panel.w, panel.h);
    ctx.clip();
    if (c.flip) {
      ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
      ctx.scale(-1, 1);
      ctx.translate(-(panel.x + panel.w / 2), -(panel.y + panel.h / 2));
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  function drawPlaceholder(ctx, panel, seed) {
    const rng = mulberry32(seed);
    const grad = ctx.createLinearGradient(panel.x, panel.y, panel.x, panel.y + panel.h);
    grad.addColorStop(0, '#3d1a5c');
    grad.addColorStop(1, '#12081f');
    ctx.fillStyle = grad;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panel.x + panel.w * 0.2, panel.y + panel.h * 0.8);
    ctx.lineTo(panel.x + panel.w * 0.5, panel.y + panel.h * 0.25);
    ctx.lineTo(panel.x + panel.w * 0.8, panel.y + panel.h * 0.8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = Math.max(12, panel.w * 0.05) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ADD PHOTO', panel.x + panel.w / 2, panel.y + panel.h / 2);
    void rng;
  }

  // Procedural skyline silhouette with lit windows.
  function drawCitySkyline(ctx, x, y, w, h, seed, grade) {
    const rng = mulberry32(seed);
    ctx.save();
    ctx.fillStyle = 'rgba(8, 4, 18, 0.92)';
    let cx = x;
    while (cx < x + w) {
      const bw = w * (0.05 + rng() * 0.09);
      const bh = h * (0.35 + rng() * 0.65);
      ctx.fillRect(cx, y + h - bh, bw, bh);
      // Rooftop antenna on tall towers.
      if (bh > h * 0.8) {
        ctx.fillRect(cx + bw / 2 - 1, y + h - bh - h * 0.12, 2, h * 0.12);
        ctx.fillStyle = grade.accent;
        ctx.beginPath();
        ctx.arc(cx + bw / 2, y + h - bh - h * 0.12, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(8, 4, 18, 0.92)';
      }
      // Lit windows.
      const cols = Math.max(1, Math.floor(bw / 14));
      const rows = Math.max(1, Math.floor(bh / 18));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (rng() < 0.35) {
            ctx.fillStyle = grade.window;
            ctx.globalAlpha = 0.5 + rng() * 0.5;
            ctx.fillRect(cx + 4 + i * 14, y + h - bh + 6 + j * 18, 5, 7);
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(8, 4, 18, 0.92)';
          }
        }
      }
      cx += bw + 2;
    }
    ctx.restore();
  }

  // One palm silhouette: curved trunk + drooping fronds.
  function drawPalmSilhouette(ctx, x, y, s, lean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(6, 3, 14, 0.95)';
    ctx.fillStyle = 'rgba(6, 3, 14, 0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(lean * 14, -46, lean * 22, -84);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * (0.08 + i * 0.13);
      const tx = lean * 22 + Math.cos(a) * 34;
      const ty = -84 + Math.sin(a) * 26 + 10;
      ctx.beginPath();
      ctx.moveTo(lean * 22, -84);
      ctx.quadraticCurveTo(lean * 22 + Math.cos(a) * 18, -84 + Math.sin(a) * 8, tx, ty);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Seeded film grain: faint speckles, same for the same seed. The count is
  // capped so a big export (1920x1080) does not pay for a quarter-million dots.
  function drawFilmGrain(ctx, W, H, seed, amount) {
    const rng = mulberry32(seed);
    const n = Math.min(60000, Math.floor(W * H * (amount || 0.00012)));
    ctx.save();
    for (let i = 0; i < n; i++) {
      const v = rng();
      ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(Math.floor(rng() * W), Math.floor(rng() * H), 1.5, 1.5);
    }
    ctx.restore();
  }

  // Caption: Anton title with outline + drop shadow, auto-fit to the width.
  function renderCaptionLettering(ctx, opts) {
    const W = opts.W, H = opts.H;
    const title = (opts.title || '').slice(0, 24);
    const subtitle = (opts.subtitle || '').slice(0, 45);
    const micro = opts.micro || '';
    const pos = opts.pos || 'bottom';
    const accent = opts.accent || '#ffd23f';
    const pad = Math.round(W * 0.045);
    const maxW = W - pad * 2;

    // Scrim so the lettering reads over any photo.
    let sy, sh;
    if (pos === 'top') { sy = 0; sh = H * 0.34; }
    else if (pos === 'middle') { sy = H * 0.33; sh = H * 0.34; }
    else { sy = H * 0.62; sh = H * 0.38; }
    const scrim = ctx.createLinearGradient(0, sy, 0, sy + sh);
    if (pos === 'top') {
      scrim.addColorStop(0, 'rgba(0,0,0,0.72)');
      scrim.addColorStop(1, 'rgba(0,0,0,0)');
    } else if (pos === 'middle') {
      scrim.addColorStop(0, 'rgba(0,0,0,0)');
      scrim.addColorStop(0.5, 'rgba(0,0,0,0.62)');
      scrim.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      scrim.addColorStop(0, 'rgba(0,0,0,0)');
      scrim.addColorStop(1, 'rgba(0,0,0,0.78)');
    }
    ctx.fillStyle = scrim;
    ctx.fillRect(0, sy, W, sh);

    // Sizes first, then anchor the whole block so no line ever falls off
    // the canvas: bottom-anchored from the micro line upward, top-anchored
    // from the title downward, middle-anchored on the block centre.
    let titleSize = 0;
    if (title) {
      titleSize = Math.round(W * 0.105);
      ctx.font = titleSize + 'px AntonCover, Anton, sans-serif';
      while (titleSize > 18 && ctx.measureText(title).width > maxW) {
        titleSize -= 2;
        ctx.font = titleSize + 'px AntonCover, Anton, sans-serif';
      }
    }
    const subSize = Math.max(13, Math.round(W * 0.026));
    const microSize = Math.max(11, Math.round(W * 0.02));
    const gapTitleSub = Math.round(titleSize * 0.42);
    const gapSubMicro = Math.round(subSize * 1.5);

    let titleBaseline = 0, subBaseline = 0, microBaseline = 0;
    if (pos === 'top') {
      titleBaseline = sy + titleSize + Math.round(H * 0.03);
      subBaseline = titleBaseline + gapTitleSub;
      microBaseline = subBaseline + gapSubMicro;
    } else if (pos === 'middle') {
      const blockH = titleSize + gapTitleSub + subSize + gapSubMicro + microSize;
      titleBaseline = Math.round((H - blockH) / 2) + titleSize;
      subBaseline = titleBaseline + gapTitleSub;
      microBaseline = subBaseline + gapSubMicro;
    } else {
      microBaseline = H - Math.round(pad * 0.6);
      subBaseline = microBaseline - gapSubMicro;
      titleBaseline = subBaseline - gapTitleSub;
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    if (title) {
      const size = titleSize;
      const ty = titleBaseline;
      ctx.font = size + 'px AntonCover, Anton, sans-serif';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size * 0.14);
      ctx.strokeStyle = 'rgba(10, 4, 20, 0.95)';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = Math.round(size * 0.05);
      ctx.shadowOffsetY = Math.round(size * 0.06);
      ctx.strokeText(title, pad, ty);
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(title, pad, ty);
    }
    if (subtitle) {
      ctx.font = '600 ' + subSize + 'px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(subtitle, pad, subBaseline);
    }
    if (micro) {
      ctx.font = '700 ' + microSize + 'px sans-serif';
      ctx.fillStyle = accent;
      const spaced = micro.split('').join('\u2009');
      ctx.fillText(spaced, pad, microBaseline);
    }
  }

  // Full cover pipeline.
  function drawComicCover(ctx, state, W, H) {
    const grade = GRADES[state.grade] || GRADES.sunset;
    const seed = hashString((state.title || '') + '|' + (state.layout || '') + '|' + (state.grade || ''));
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#12081f';
    ctx.fillRect(0, 0, W, H);

    const panels = layoutPanels(state.layout || 'classic', W, H);
    const photos = panelPhotos(state);
    panels.forEach(function (panel, i) {
      const photo = photos.length ? photos[i % photos.length] : null;
      if (photo && photo.img) {
        fitPhotoToPanel(ctx, photo.img, panel, (state.crops || {})[i] || defaultCrop());
      } else {
        drawPlaceholder(ctx, panel, seed + i * 97);
      }
      ctx.strokeStyle = 'rgba(255, 210, 63, 0.85)';
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
    });

    // Skyline band across the bottom, palms at both ends.
    const bandH = Math.round(H * 0.17);
    drawCitySkyline(ctx, 0, H - bandH, W, bandH, seed + 7, grade);
    drawPalmSilhouette(ctx, W * 0.04, H - 4, H / 700, -1);
    drawPalmSilhouette(ctx, W * 0.96, H - 4, H / 760, 1);

    // Grade tint + warm wash.
    ctx.fillStyle = grade.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = grade.warm;
    ctx.fillRect(0, 0, W, H);

    // Vignette.
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    drawFilmGrain(ctx, W, H, seed + 13, 0.00012);

    renderCaptionLettering(ctx, {
      W: W, H: H,
      title: state.title, subtitle: state.subtitle, micro: state.micro,
      pos: state.captionPos || 'bottom', accent: grade.accent
    });
    ctx.restore();
  }

  function exportCoverPng(state, W, H) {
    return new Promise(function (resolve) {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      drawComicCover(ctx, state, W, H);
      canvas.toBlob(function (blob) { resolve(blob); }, 'image/png');
    });
  }

  function exportPng1080(state) {
    return exportCoverPng(state, 1080, 1080);
  }

  global.CoverRender = {
    GRADES: GRADES,
    layoutPanels: layoutPanels,
    fitPhotoToPanel: fitPhotoToPanel,
    drawComicCover: drawComicCover,
    renderCaptionLettering: renderCaptionLettering,
    drawCitySkyline: drawCitySkyline,
    drawPalmSilhouette: drawPalmSilhouette,
    drawFilmGrain: drawFilmGrain,
    exportCoverPng: exportCoverPng,
    exportPng1080: exportPng1080,
    mulberry32: mulberry32,
    makeDefaultState: makeDefaultState,
    defaultCrop: defaultCrop,
    panelPhotos: panelPhotos
  };
})(typeof window !== 'undefined' ? window : globalThis);
