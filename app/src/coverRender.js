// coverRender.js — Vice City Multi-Panel Studio renderer (canvas 2D).
// Draws a multi-panel GTA-style cover from a state object and loaded photos.
// No network use: every asset comes from local files or data: URIs.

(function (global) {
  'use strict';

  // ---------------------------------------------------------------- grades
  var GRADES = {
    sunset: {
      label: 'Vice City Sunset', tint: '#ff7a18', tintStrength: 0.18,
      skyTop: '#3a0d4d', skyBottom: '#ff5e3a', gutter: '#1c0b26',
      skyline: '#160a20', windowLit: '#ffd166', scrim: 'rgba(20,4,32,0.72)'
    },
    neon: {
      label: 'Neon Nights', tint: '#b537f2', tintStrength: 0.24,
      skyTop: '#0b1030', skyBottom: '#7b2ff7', gutter: '#0a0618',
      skyline: '#070312', windowLit: '#39d0ff', scrim: 'rgba(6,2,24,0.74)'
    },
    tropical: {
      label: 'Tropical Heat', tint: '#ffb703', tintStrength: 0.16,
      skyTop: '#083344', skyBottom: '#f97316', gutter: '#0c1f14',
      skyline: '#0a1f16', windowLit: '#fde68a', scrim: 'rgba(8,32,26,0.68)'
    },
    crime: {
      label: 'Crime Drama', tint: '#3a6ea5', tintStrength: 0.20,
      skyTop: '#0f172a', skyBottom: '#475569', gutter: '#0a0f1c',
      skyline: '#05070d', windowLit: '#fca5a5', scrim: 'rgba(2,6,18,0.76)'
    }
  };

  var GRADE_ORDER = ['sunset', 'neon', 'tropical', 'crime'];
  var LAYOUTS = ['classic', 'duo', 'city', 'grid', 'sunset', 'minimal'];

  // ------------------------------------------------------------- rng / state
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function defaultCrop() {
    return { x: 0, y: 0, zoom: 1, flip: false };
  }

  function makeDefaultState() {
    return {
      layout: 'classic',
      grade: 'sunset',
      seed: 1986,
      caption: {
        title: 'SUNSET HEIST',
        subtitle: 'A Vice City story in four panels',
        micro: 'VICE CITY  •  EST. 1986',
        position: 'bottom'
      },
      photoIndex: 0,
      crops: {}
    };
  }

  // ---------------------------------------------------------------- layouts
  // Each panel: {x, y, w, h} in pixels. Gutter g separates panels.
  function layoutPanels(layout, W, H) {
    var g = Math.max(4, Math.round(Math.min(W, H) * 0.008));
    var panels = [];
    function add(fx, fy, fw, fh) {
      panels.push({
        x: Math.round(fx * W), y: Math.round(fy * H),
        w: Math.round(fw * W), h: Math.round(fh * H)
      });
    }
    if (layout === 'classic') {
      add(0, 0, 0.62, 0.76);
      add(0.62, 0, 0.38, 0.37);
      add(0.62, 0.37, 0.38, 0.39);
      add(0, 0.76, 1, 0.24);
    } else if (layout === 'duo') {
      add(0, 0, 0.5, 1);
      add(0.5, 0, 0.5, 1);
    } else if (layout === 'city') {
      add(0, 0, 1, 0.55);
      add(0, 0.55, 0.34, 0.45);
      add(0.34, 0.55, 0.33, 0.45);
      add(0.67, 0.55, 0.33, 0.45);
    } else if (layout === 'grid') {
      add(0, 0, 0.5, 0.5);
      add(0.5, 0, 0.5, 0.5);
      add(0, 0.5, 0.5, 0.5);
      add(0.5, 0.5, 0.5, 0.5);
    } else if (layout === 'sunset') {
      add(0, 0, 1, 0.62);
      add(0, 0.62, 0.34, 0.38);
      add(0.34, 0.62, 0.33, 0.38);
      add(0.67, 0.62, 0.33, 0.38);
    } else { // minimal
      add(0, 0, 1, 0.82);
      add(0, 0.82, 1, 0.18);
    }
    // Apply gutters by shrinking each panel toward its own centre.
    return panels.map(function (p) {
      var nx = p.x + g / 2, ny = p.y + g / 2;
      var nw = Math.max(4, p.w - g), nh = Math.max(4, p.h - g);
      if (p.x === 0) { nx = 0; nw = Math.max(4, p.w - g / 2); }
      if (p.y === 0) { ny = 0; nh = Math.max(4, p.h - g / 2); }
      if (p.x + p.w >= W) { nw = Math.max(4, W - nx); }
      if (p.y + p.h >= H) { nh = Math.max(4, H - ny); }
      return { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) };
    });
  }

  // -------------------------------------------------------------- photo fit
  // Cover-fit an image into a panel rect, with crop pan/zoom/flip.
  // Slight upward bias keeps faces out of the cut zone.
  function fitPhotoToPanel(ctx, img, panel, crop) {
    if (!img || !img.naturalWidth) return false;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var pw = panel.w, ph = panel.h;
    var base = Math.max(pw / iw, ph / ih);
    var zoom = crop && crop.zoom ? crop.zoom : 1;
    var s = base * zoom;
    var dw = iw * s, dh = ih * s;
    var panX = crop && crop.x ? crop.x : 0;
    var panY = crop && crop.y ? crop.y : 0;
    // Overflow available for panning; bias the default window upward.
    var ox = Math.max(0, (dw - pw) / 2);
    var oy = Math.max(0, (dh - ph) / 2);
    var biasY = oy > 0 ? -0.12 * oy : 0;
    var cx = panel.x + pw / 2 - panX * ox;
    var cy = panel.y + ph / 2 - panY * oy + biasY;
    ctx.save();
    ctx.beginPath();
    ctx.rect(panel.x, panel.y, pw, ph);
    ctx.clip();
    ctx.translate(cx, cy);
    var flip = crop && crop.flip ? -1 : 1;
    ctx.scale(flip, 1);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    return true;
  }

  // ------------------------------------------------------------ skyline/palm
  function drawCitySkyline(ctx, W, H, grade, seed) {
    var g = GRADES[grade] || GRADES.sunset;
    var rnd = mulberry32(seed * 7 + 11);
    var base = H * 0.86;
    var x = -10;
    ctx.save();
    ctx.fillStyle = g.skyline;
    while (x < W + 20) {
      var bw = 26 + rnd() * 64;
      var bh = H * (0.06 + rnd() * 0.13);
      var top = base - bh;
      ctx.fillRect(x, top, bw, bh + H - base + 4);
      // Antenna on tall towers.
      if (bh > H * 0.14) {
        ctx.fillRect(x + bw / 2 - 1, top - 14, 2, 14);
        ctx.fillStyle = '#ff5470';
        ctx.fillRect(x + bw / 2 - 2, top - 17, 4, 4);
        ctx.fillStyle = g.skyline;
      }
      // Lit windows.
      ctx.fillStyle = g.windowLit;
      var cols = Math.floor(bw / 12), rows = Math.floor(bh / 16);
      for (var c = 0; c < cols; c++) {
        for (var r = 0; r < rows; r++) {
          if (rnd() < 0.42) {
            ctx.globalAlpha = 0.35 + rnd() * 0.55;
            ctx.fillRect(x + 4 + c * 12, top + 6 + r * 16, 5, 7);
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = g.skyline;
      x += bw + 2 + rnd() * 8;
    }
    ctx.restore();
  }

  function drawPalmSilhouette(ctx, x, y, scale, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    // Trunk, leaning.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(10, -46, 26, -78);
    ctx.stroke();
    // Fronds.
    var tx = 26, ty = -78;
    var fronds = [
      [-52, -96], [-30, -108], [-4, -112], [22, -106], [48, -92],
      [-58, -72], [56, -66]
    ];
    ctx.lineWidth = 4;
    for (var i = 0; i < fronds.length; i++) {
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(
        tx + fronds[i][0] * 0.55, ty + fronds[i][1] * 0.45 - 10,
        tx + fronds[i][0], ty + fronds[i][1]
      );
      ctx.stroke();
    }
    // Coconuts.
    ctx.beginPath();
    ctx.arc(tx - 4, ty + 5, 4, 0, Math.PI * 2);
    ctx.arc(tx + 4, ty + 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------------------------ grain
  var grainCache = {};
  function drawFilmGrain(ctx, W, H, seed, amount) {
    var key = seed + ':' + Math.round(amount * 100);
    var tile = grainCache[key];
    if (!tile) {
      tile = document.createElement('canvas');
      tile.width = 140; tile.height = 140;
      var tctx = tile.getContext('2d');
      var img = tctx.createImageData(140, 140);
      var rnd = mulberry32(seed * 13 + 5);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = Math.floor(rnd() * 255);
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
      grainCache[key] = tile;
    }
    ctx.save();
    ctx.globalAlpha = amount;
    ctx.globalCompositeOperation = 'overlay';
    var pat = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // --------------------------------------------------------------- caption
  function fitFont(ctx, text, maxW, startPx, family) {
    var px = startPx;
    ctx.font = '400 ' + px + 'px ' + family;
    while (px > 12 && ctx.measureText(text).width > maxW) {
      px -= 2;
      ctx.font = '400 ' + px + 'px ' + family;
    }
    return px;
  }

  function renderCaptionLettering(ctx, caption, W, H, grade) {
    var g = GRADES[grade] || GRADES.sunset;
    var pos = caption.position || 'bottom';
    var margin = Math.round(W * 0.045);
    var maxW = W - margin * 2;
    var title = (caption.title || '').toUpperCase().slice(0, 24);
    var subtitle = (caption.subtitle || '').slice(0, 45);
    var micro = (caption.micro || '').slice(0, 60);
    if (!title && !subtitle && !micro) return;

    var family = '"AntonCover", "Arial Black", sans-serif';
    var titlePx = title ? fitFont(ctx, title, maxW, Math.round(W * 0.115), family) : 0;
    var subPx = subtitle ? Math.max(14, Math.round(titlePx * 0.26)) : 0;
    var microPx = micro ? Math.max(12, Math.round(titlePx * 0.20)) : 0;
    var gap = Math.round(titlePx * 0.14);
    var blockH = (title ? titlePx : 0) + (subtitle ? subPx + gap : 0) +
      (micro ? microPx + gap : 0);

    var yTop;
    if (pos === 'top') yTop = Math.round(H * 0.05);
    else if (pos === 'middle') yTop = Math.round((H - blockH) / 2);
    else yTop = Math.round(H - blockH - H * 0.045);

    // Scrim under the text block.
    ctx.save();
    var grad = ctx.createLinearGradient(0, yTop - gap, 0, yTop + blockH + gap);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.35, g.scrim);
    grad.addColorStop(1, g.scrim);
    ctx.fillStyle = grad;
    ctx.fillRect(0, yTop - gap, W, blockH + gap * 2);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    var y = yTop;
    if (title) {
      ctx.font = '400 ' + titlePx + 'px ' + family;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(10,4,20,0.95)';
      ctx.lineWidth = Math.max(3, Math.round(titlePx / 11));
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = Math.round(titlePx / 9);
      ctx.shadowOffsetY = Math.round(titlePx / 16);
      ctx.strokeText(title, margin, y);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(title, margin, y);
      y += titlePx + gap;
    }
    if (subtitle) {
      ctx.font = '700 ' + subPx + 'px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.fillText(subtitle, margin, y);
      y += subPx + gap;
    }
    if (micro) {
      ctx.font = '700 ' + microPx + 'px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,214,102,0.95)';
      var tracking = micro.split('').join('  ');
      ctx.fillText(tracking, margin, y);
    }
    ctx.restore();
  }

  // -------------------------------------------------------------- main draw
  function drawComicCover(ctx, state, photos, W, H) {
    var grade = GRADES[state.grade] ? state.grade : 'sunset';
    var g = GRADES[grade];
    var seed = state.seed || 1986;

    // Backdrop gradient.
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, g.skyTop);
    sky.addColorStop(1, g.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    var panels = layoutPanels(state.layout || 'classic', W, H);
    var list = photos || [];
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      var photo = list.length ? list[(state.photoIndex || 0) % list.length] : null;
      // Rotate photos across panels when more than one is loaded, starting
      // from the selected photo so it leads the hero panel.
      if (list.length > 1) photo = list[(i + (state.photoIndex || 0)) % list.length];
      var crop = (state.crops && state.crops[i]) || defaultCrop();
      ctx.save();
      ctx.fillStyle = g.gutter;
      ctx.fillRect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);
      ctx.restore();
      if (photo && photo.img) {
        fitPhotoToPanel(ctx, photo.img, p, crop);
      } else {
        var pg = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
        pg.addColorStop(0, g.skyTop);
        pg.addColorStop(1, g.skyBottom);
        ctx.fillStyle = pg;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '700 ' + Math.max(14, Math.round(p.w * 0.05)) + 'px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ADD PHOTO', p.x + p.w / 2, p.y + p.h / 2);
      }
      // Panel frame.
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(2, Math.round(Math.min(W, H) * 0.004));
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.restore();
    }

    // Grade tint over everything.
    ctx.save();
    ctx.globalAlpha = g.tintStrength;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = g.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = g.tintStrength * 0.5;
    ctx.fillStyle = g.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Skyline + palms along the bottom, under the caption.
    drawCitySkyline(ctx, W, H, grade, seed);
    var palmScale = Math.min(W, H) / 620;
    drawPalmSilhouette(ctx, Math.round(W * 0.03), Math.round(H * 0.985), palmScale, g.skyline);
    drawPalmSilhouette(ctx, Math.round(W * 0.965), Math.round(H * 0.99), palmScale * 0.8, g.skyline);

    renderCaptionLettering(ctx, state.caption || {}, W, H, grade);
    drawFilmGrain(ctx, W, H, seed, 0.10);
  }

  // ---------------------------------------------------------------- export
  function exportCoverPng(state, photos, W, H) {
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    drawComicCover(ctx, state, photos, W, H);
    return canvas;
  }

  function exportPng1080(state, photos) {
    return exportCoverPng(state, photos, 1080, 1080);
  }

  global.coverRender = {
    GRADES: GRADES,
    GRADE_ORDER: GRADE_ORDER,
    LAYOUTS: LAYOUTS,
    mulberry32: mulberry32,
    defaultCrop: defaultCrop,
    makeDefaultState: makeDefaultState,
    layoutPanels: layoutPanels,
    fitPhotoToPanel: fitPhotoToPanel,
    drawCitySkyline: drawCitySkyline,
    drawPalmSilhouette: drawPalmSilhouette,
    drawFilmGrain: drawFilmGrain,
    renderCaptionLettering: renderCaptionLettering,
    drawComicCover: drawComicCover,
    exportCoverPng: exportCoverPng,
    exportPng1080: exportPng1080
  };
})(typeof window !== 'undefined' ? window : this);
