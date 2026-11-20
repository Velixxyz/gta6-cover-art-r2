// Vice City Multi-Panel Studio — editor wiring.
// Photos stay on the user's machine (FileReader / object URLs, never an
// upload). Every control re-renders the same drawComicCover the exporter
// uses, so the preview is the cover.

import { drawComicCover, exportCoverPng, EXPORT_SIZES, GRADES, LAYOUTS, layoutPanels, DEFAULT_CROPS } from './coverRender.js';

export function defaultStudioState() {
  return {
    layout: 'classic',
    grade: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'Vice City Nights',
    micro: 'Ocean Drive • Leonida • 2026',
    captionPos: 'bottom',
    exportSize: '1080x1080',
    photos: [],
    panels: null, // built from the layout on first render
    selectedPanel: 0,
  };
}

function clonePanels(panels) {
  return panels.map((p) => ({ photo: p.photo, crop: { ...p.crop } }));
}

export function buildDefaultPanels(layout, photoCount) {
  const rects = layoutPanels(layout, true);
  return rects.map((r, i) => ({
    photo: photoCount > 0 ? i % photoCount : -1,
    crop: { ...DEFAULT_CROPS[i % DEFAULT_CROPS.length] },
  }));
}

function panelRects(w, h, layout) {
  const gutter = Math.max(4, Math.round(Math.min(w, h) * 0.012));
  return layoutPanels(layout, w >= h).map((frac) => ([
    Math.round(frac[0] * w + gutter / 2),
    Math.round(frac[1] * h + gutter / 2),
    Math.round(frac[2] * w - gutter),
    Math.round(frac[3] * h - gutter),
  ]));
}

export function createStudio(root) {
  const state = defaultStudioState();
  const preview = root.querySelector('#coverPreview');
  const statusEl = root.querySelector('#studioStatus');
  const thumbsEl = root.querySelector('#photoThumbs');
  const undoStack = [];
  const redoStack = [];
  let dragPanel = -1;
  let dragLast = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function snapshot() {
    return JSON.stringify({
      layout: state.layout, grade: state.grade, title: state.title,
      subtitle: state.subtitle, micro: state.micro, captionPos: state.captionPos,
      exportSize: state.exportSize, panels: state.panels,
    });
  }

  function pushHistory() {
    undoStack.push(snapshot());
    if (undoStack.length > 40) undoStack.shift();
    redoStack.length = 0;
  }

  function restore(json) {
    const data = JSON.parse(json);
    Object.assign(state, data);
    state.panels = data.panels ? clonePanels(data.panels) : null;
    syncControls();
    renderPreview();
  }

  function undoStudio() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
    setStatus('Undone.');
  }

  function redoStudio() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
    setStatus('Redone.');
  }

  function ensurePanels() {
    const count = layoutPanels(state.layout, true).length;
    if (!state.panels || state.panels.length !== count) {
      state.panels = buildDefaultPanels(state.layout, state.photos.length);
    }
    // A photo added later fills empty panels.
    state.panels.forEach((p, i) => {
      if (p.photo < 0 && state.photos.length) p.photo = i % state.photos.length;
    });
  }

  function renderPreview() {
    const [w, h] = EXPORT_SIZES[state.exportSize] || EXPORT_SIZES['1080x1080'];
    if (preview.width !== w || preview.height !== h) {
      preview.width = w;
      preview.height = h;
    }
    ensurePanels();
    drawComicCover(preview, state);
    renderThumbs();
  }

  function renderThumbs() {
    if (!thumbsEl) return;
    thumbsEl.innerHTML = '';
    state.photos.forEach((img, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb';
      btn.title = `Photo ${idx + 1} — click to put it in the selected panel`;
      const thumb = document.createElement('img');
      thumb.src = img.src;
      thumb.alt = `Photo ${idx + 1}`;
      btn.appendChild(thumb);
      btn.addEventListener('click', () => {
        pushHistory();
        ensurePanels();
        const panel = state.panels[state.selectedPanel];
        if (panel) panel.photo = idx;
        renderPreview();
        setStatus(`Photo ${idx + 1} is now in panel ${state.selectedPanel + 1}.`);
      });
      thumbsEl.appendChild(btn);
    });
    if (!state.photos.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No photos yet — add one, or load a sample below.';
      thumbsEl.appendChild(empty);
    }
  }

  function addPhotos(files) {
    const list = Array.from(files || []).filter((f) => /^image\//.test(f.type));
    if (!list.length) { setStatus('That file is not an image. Try a JPG, PNG or WebP.'); return; }
    if (state.photos.length + list.length > 10) { setStatus('Ten photos at most — remove one first.'); return; }
    pushHistory();
    let loaded = 0;
    list.forEach((file) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        state.photos.push(img);
        loaded += 1;
        if (loaded === list.length) {
          ensurePanels();
          renderPreview();
          setStatus(`${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded. Pick a layout, write a caption, export.`);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); setStatus('Could not read that image file.'); };
      img.src = url;
    });
  }

  function loadSamplePhoto(name) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        pushHistory();
        state.photos = [img];
        state.panels = null;
        renderPreview();
        setStatus(`Sample photo ${name} loaded.`);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`sample ${name} failed to load`));
      img.src = `samples/${name}.jpg`;
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function exportCurrentSize() {
    setStatus('Exporting PNG…');
    const blob = await exportCoverPng(state, state.exportSize);
    downloadBlob(blob, `cover-${state.exportSize}.png`);
    setStatus(`Saved cover-${state.exportSize}.png — post it.`);
  }

  async function exportAllSizes() {
    setStatus('Exporting all three sizes…');
    for (const sizeName of Object.keys(EXPORT_SIZES)) {
      const blob = await exportCoverPng(state, sizeName);
      downloadBlob(blob, `cover-${sizeName}.png`);
    }
    setStatus('Saved all three sizes: 1080×1080, 1080×1350, 1920×1080.');
  }

  function syncControls() {
    root.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
    root.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
    root.querySelectorAll('[data-pos]').forEach((b) => b.classList.toggle('active', b.dataset.pos === state.captionPos));
    root.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.exportSize));
    const title = root.querySelector('#captionTitle');
    if (title && title.value !== state.title) title.value = state.title;
    const sub = root.querySelector('#captionSub');
    if (sub && sub.value !== state.subtitle) sub.value = state.subtitle;
    const micro = root.querySelector('#captionMicro');
    if (micro && micro.value !== state.micro) micro.value = state.micro;
  }

  function bindControls() {
    const fileInput = root.querySelector('#photoInput');
    if (fileInput) fileInput.addEventListener('change', (e) => { addPhotos(e.target.files); e.target.value = ''; });
    const dropZone = root.querySelector('#dropZone');
    if (dropZone) {
      ['dragover', 'dragenter'].forEach((ev) => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('drag'); }));
      ['dragleave', 'drop'].forEach((ev) => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove('drag'); }));
      dropZone.addEventListener('drop', (e) => addPhotos(e.dataTransfer.files));
      dropZone.addEventListener('click', () => fileInput && fileInput.click());
    }
    root.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', () => loadSamplePhoto(b.dataset.sample).catch(() => setStatus('Sample photo failed to load.'))));
    root.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
      if (state.layout === b.dataset.layout) return;
      pushHistory();
      state.layout = b.dataset.layout;
      state.panels = null;
      syncControls(); renderPreview();
      setStatus(`Layout: ${LAYOUTS[state.layout].label}. Photos and caption stayed put.`);
    }));
    root.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => {
      if (state.grade === b.dataset.grade) return;
      pushHistory();
      state.grade = b.dataset.grade;
      syncControls(); renderPreview();
      setStatus(`Grade: ${GRADES[state.grade].label}.`);
    }));
    root.querySelectorAll('[data-pos]').forEach((b) => b.addEventListener('click', () => {
      if (state.captionPos === b.dataset.pos) return;
      pushHistory();
      state.captionPos = b.dataset.pos;
      syncControls(); renderPreview();
    }));
    root.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
      if (state.exportSize === b.dataset.size) return;
      pushHistory();
      state.exportSize = b.dataset.size;
      syncControls(); renderPreview();
      setStatus(`Export size: ${b.dataset.size}. Layout reflowed for it.`);
    }));
    const title = root.querySelector('#captionTitle');
    if (title) title.addEventListener('input', () => { state.title = title.value; renderPreview(); });
    const sub = root.querySelector('#captionSub');
    if (sub) sub.addEventListener('input', () => { state.subtitle = sub.value; renderPreview(); });
    const micro = root.querySelector('#captionMicro');
    if (micro) micro.addEventListener('input', () => { state.micro = micro.value; renderPreview(); });
    const exportBtn = root.querySelector('#exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportCurrentSize);
    const exportAllBtn = root.querySelector('#exportAllBtn');
    if (exportAllBtn) exportAllBtn.addEventListener('click', exportAllSizes);
    const undoBtn = root.querySelector('#undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undoStudio);
    const redoBtn = root.querySelector('#redoBtn');
    if (redoBtn) redoBtn.addEventListener('click', redoStudio);
    const resetBtn = root.querySelector('#resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      pushHistory();
      const photos = state.photos;
      Object.assign(state, defaultStudioState(), { photos });
      state.panels = null;
      syncControls(); renderPreview();
      setStatus('Design reset. Your photos are still here.');
    });
    const flipBtn = root.querySelector('#flipBtn');
    if (flipBtn) flipBtn.addEventListener('click', () => {
      pushHistory(); ensurePanels();
      const panel = state.panels[state.selectedPanel];
      if (panel) { panel.crop.flip = !panel.crop.flip; renderPreview(); }
    });
    const zoomIn = root.querySelector('#zoomInBtn');
    if (zoomIn) zoomIn.addEventListener('click', () => { pushHistory(); ensurePanels(); const p = state.panels[state.selectedPanel]; if (p) { p.crop.zoom = Math.min(4, (p.crop.zoom || 1) * 1.2); renderPreview(); } });
    const zoomOut = root.querySelector('#zoomOutBtn');
    if (zoomOut) zoomOut.addEventListener('click', () => { pushHistory(); ensurePanels(); const p = state.panels[state.selectedPanel]; if (p) { p.crop.zoom = Math.max(1, (p.crop.zoom || 1) / 1.2); renderPreview(); } });
    const resetCrop = root.querySelector('#resetCropBtn');
    if (resetCrop) resetCrop.addEventListener('click', () => {
      pushHistory(); ensurePanels();
      const p = state.panels[state.selectedPanel];
      if (p) { p.crop = { ...DEFAULT_CROPS[state.selectedPanel % DEFAULT_CROPS.length] }; renderPreview(); }
    });
    const useAll = root.querySelector('#useAllBtn');
    if (useAll) useAll.addEventListener('click', () => {
      pushHistory(); ensurePanels();
      const sel = state.selectedPanel;
      const photo = state.panels[sel] ? state.panels[sel].photo : -1;
      state.panels.forEach((p) => { p.photo = photo; });
      renderPreview();
      setStatus('One photo now fills every panel, cropped differently in each.');
    });
    // Crop by dragging on the preview: pick a panel, drag to pan its photo.
    preview.addEventListener('pointerdown', (e) => {
      const rect = preview.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (preview.width / rect.width);
      const y = (e.clientY - rect.top) * (preview.height / rect.height);
      const rects = panelRects(preview.width, preview.height, state.layout);
      const hit = rects.findIndex((r) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]);
      if (hit < 0) return;
      dragPanel = hit;
      state.selectedPanel = hit;
      dragLast = { x, y };
      preview.setPointerCapture(e.pointerId);
    });
    preview.addEventListener('pointermove', (e) => {
      if (dragPanel < 0 || !dragLast) return;
      const rect = preview.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (preview.width / rect.width);
      const y = (e.clientY - rect.top) * (preview.height / rect.height);
      const rects = panelRects(preview.width, preview.height, state.layout);
      const r = rects[dragPanel];
      const panel = state.panels && state.panels[dragPanel];
      if (!r || !panel) return;
      const zoom = Math.max(1, panel.crop.zoom || 1);
      panel.crop.cx = Math.min(1, Math.max(0, panel.crop.cx - (x - dragLast.x) / (r[2] * zoom)));
      panel.crop.cy = Math.min(1, Math.max(0, panel.crop.cy - (y - dragLast.y) / (r[3] * zoom)));
      dragLast = { x, y };
      renderPreview();
    });
    const endDrag = () => { if (dragPanel >= 0) pushHistory(); dragPanel = -1; dragLast = null; };
    preview.addEventListener('pointerup', endDrag);
    preview.addEventListener('pointercancel', endDrag);
    preview.addEventListener('wheel', (e) => {
      e.preventDefault();
      ensurePanels();
      const panel = state.panels[state.selectedPanel];
      if (!panel) return;
      panel.crop.zoom = Math.min(4, Math.max(1, (panel.crop.zoom || 1) * (e.deltaY < 0 ? 1.1 : 0.9)));
      renderPreview();
    }, { passive: false });
    preview.addEventListener('dblclick', () => {
      ensurePanels();
      const panel = state.panels[state.selectedPanel];
      if (panel) { panel.crop = { ...DEFAULT_CROPS[state.selectedPanel % DEFAULT_CROPS.length] }; renderPreview(); }
    });
  }

  bindControls();
  syncControls();
  renderPreview();
  return {
    state,
    renderPreview,
    addPhotos,
    loadSamplePhoto,
    exportCurrentSize,
    exportAllSizes,
    undoStudio,
    redoStudio,
    setStatus,
  };
}
