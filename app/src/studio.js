// Vice City Multi-Panel Studio — editor wiring.
// Owns the page state, the photo library, undo/redo, per-panel crop
// gestures and the PNG exports. The preview and the export both draw
// through drawComicCover in coverRender.js, so they can never drift apart.

import {
  GRADES,
  LAYOUTS,
  drawComicCover,
  downloadCoverPng,
  exportCoverPng,
  layoutPanels,
  makeDefaultState,
  defaultCrop,
} from './coverRender.js';

const EXPORT_SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

function snapshotOf(state, selected) {
  return JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    micro: state.micro,
    captionPos: state.captionPos,
    panelPhotos: state.panelPhotos,
    crops: state.crops,
    selected,
  });
}

function applySnapshot(state, snap) {
  const data = JSON.parse(snap);
  state.layout = data.layout;
  state.grade = data.grade;
  state.title = data.title;
  state.subtitle = data.subtitle;
  state.micro = data.micro;
  state.captionPos = data.captionPos;
  state.panelPhotos = data.panelPhotos;
  state.crops = data.crops;
  return data.selected;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

export function initStudio(options = {}) {
  const shot = options.shot ?? null;
  const state = makeDefaultState();
  const canvas = document.getElementById('preview');
  const ctx = canvas.getContext('2d');
  let selected = 0;
  let previewSize = 'square';
  let lastPanels = [];
  const undoStack = [];
  const redoStack = [];
  let drag = null;

  const api = {
    state,
    loadSample,
    loadFiles,
    render,
    setLayout,
    setGrade,
    setPreviewSize,
    exportAll,
  };

  function pushHistory() {
    undoStack.push(snapshotOf(state, selected));
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
    syncHistoryButtons();
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshotOf(state, selected));
    selected = applySnapshot(state, undoStack.pop());
    syncInputs();
    render();
    syncHistoryButtons();
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshotOf(state, selected));
    selected = applySnapshot(state, redoStack.pop());
    syncInputs();
    render();
    syncHistoryButtons();
  }

  function syncHistoryButtons() {
    const u = document.getElementById('undoBtn');
    const r = document.getElementById('redoBtn');
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }

  function ensurePanels() {
    const count = LAYOUTS[state.layout].panels;
    while (state.panelPhotos.length < count) state.panelPhotos.push(0);
    while (state.crops.length < count) state.crops.push(defaultCrop());
    state.panelPhotos.length = count;
    state.crops.length = count;
    if (selected >= count) selected = 0;
  }

  function sizeCanvas() {
    if (shot === 'cover') {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    } else {
      const size = EXPORT_SIZES[previewSize];
      const longSide = 880;
      const scale = longSide / Math.max(size.w, size.h);
      canvas.width = Math.round(size.w * scale);
      canvas.height = Math.round(size.h * scale);
    }
  }

  function render() {
    ensurePanels();
    sizeCanvas();
    lastPanels = drawComicCover(ctx, state, canvas.width, canvas.height);
    syncPanelLabel();
  }

  function syncPanelLabel() {
    const label = document.getElementById('panelLabel');
    if (!label) return;
    const photo = state.photos[state.panelPhotos[selected]];
    label.textContent = `Panel ${selected + 1} of ${lastPanels.length} — ${photo ? photo.name : 'no photo yet'}`;
  }

  function syncInputs() {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    };
    set('titleInput', state.title);
    set('subtitleInput', state.subtitle);
    set('microInput', state.micro);
    document.querySelectorAll('.layout-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.layout === state.layout));
    document.querySelectorAll('.grade-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.grade === state.grade));
    document.querySelectorAll('.pos-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.pos === state.captionPos));
    const sizeSelect = document.getElementById('previewSize');
    if (sizeSelect) sizeSelect.value = previewSize;
    renderThumbs();
  }

  function renderThumbs() {
    const box = document.getElementById('thumbs');
    if (!box) return;
    box.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb';
      btn.title = `${photo.name} — use in panel ${selected + 1}`;
      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.name;
      btn.appendChild(img);
      const tag = document.createElement('span');
      tag.textContent = photo.name;
      btn.appendChild(tag);
      if (state.panelPhotos[selected] === i) btn.classList.add('in-use');
      btn.addEventListener('click', () => {
        pushHistory();
        state.panelPhotos[selected] = i;
        render();
      });
      box.appendChild(btn);
    });
    const empty = document.getElementById('photoEmpty');
    if (empty) empty.hidden = state.photos.length > 0;
  }

  async function addPhoto(url, name) {
    const img = await loadImage(url);
    state.photos.push({ img, url, name });
    if (state.photos.length === 1) {
      state.panelPhotos = state.panelPhotos.map(() => 0);
    }
    renderThumbs();
    return state.photos.length - 1;
  }

  async function loadSample(name, caption, extra = {}) {
    if (extra.grade && GRADES[extra.grade]) state.grade = extra.grade;
    if (extra.layout && LAYOUTS[extra.layout]) state.layout = extra.layout;
    if (caption) state.title = caption;
    const index = await addPhoto(`samples/${name}.jpg`, `${name}.jpg`);
    state.panelPhotos = state.panelPhotos.map(() => index);
    syncInputs();
    render();
    return index;
  }

  async function loadFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/')).slice(0, 10 - state.photos.length);
    for (const file of files) {
      const url = URL.createObjectURL(file);
      try {
        await addPhoto(url, file.name);
      } catch (e) {
        URL.revokeObjectURL(url);
      }
    }
    if (state.photos.length) {
      pushHistory();
      render();
    }
  }

  function setLayout(layout) {
    if (!LAYOUTS[layout] || layout === state.layout) return;
    pushHistory();
    state.layout = layout;
    ensurePanels();
    syncInputs();
    render();
  }

  function setGrade(grade) {
    if (!GRADES[grade] || grade === state.grade) return;
    pushHistory();
    state.grade = grade;
    syncInputs();
    render();
  }

  // Switch the preview aspect (square / portrait / wide) and re-render.
  function setPreviewSize(size) {
    if (!EXPORT_SIZES[size] || size === previewSize) return;
    previewSize = size;
    syncInputs();
    render();
  }

  function exportOne(key) {
    const size = EXPORT_SIZES[key];
    downloadCoverPng(state, size.w, size.h, `vice-city-cover-${size.w}x${size.h}.png`);
  }

  function exportAll() {
    const keys = Object.keys(EXPORT_SIZES);
    keys.forEach((key, i) => {
      setTimeout(() => exportOne(key), i * 350);
    });
  }

  function pickPanelAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    for (let i = lastPanels.length - 1; i >= 0; i -= 1) {
      const p = lastPanels[i];
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
    }
    return -1;
  }

  function wireEvents() {
    const fileInput = document.getElementById('photoInput');
    const addBtn = document.getElementById('addPhotoBtn');
    if (addBtn && fileInput) {
      addBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        if (fileInput.files?.length) loadFiles(fileInput.files);
        fileInput.value = '';
      });
    }
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
      ['dragover', 'dragenter'].forEach((ev) =>
        dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('dragging'); }));
      ['dragleave', 'drop'].forEach((ev) =>
        dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove('dragging'); }));
      dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer?.files?.length) loadFiles(e.dataTransfer.files);
      });
    }
    document.querySelectorAll('.layout-btn').forEach((b) =>
      b.addEventListener('click', () => setLayout(b.dataset.layout)));
    document.querySelectorAll('.grade-btn').forEach((b) =>
      b.addEventListener('click', () => setGrade(b.dataset.grade)));
    document.querySelectorAll('.pos-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.pos === state.captionPos) return;
        pushHistory();
        state.captionPos = b.dataset.pos;
        syncInputs();
        render();
      }));

    const titleInput = document.getElementById('titleInput');
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        state.title = titleInput.value.toUpperCase().slice(0, 24);
        render();
      });
      titleInput.addEventListener('change', pushHistory);
    }
    const subtitleInput = document.getElementById('subtitleInput');
    if (subtitleInput) {
      subtitleInput.addEventListener('input', () => {
        state.subtitle = subtitleInput.value.slice(0, 45);
        render();
      });
      subtitleInput.addEventListener('change', pushHistory);
    }
    const microInput = document.getElementById('microInput');
    if (microInput) {
      microInput.addEventListener('input', () => {
        state.micro = microInput.value;
        render();
      });
      microInput.addEventListener('change', pushHistory);
    }
    const sizeSelect = document.getElementById('previewSize');
    if (sizeSelect) {
      sizeSelect.addEventListener('change', () => {
        previewSize = sizeSelect.value;
        render();
      });
    }

    document.querySelectorAll('.export-btn').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.size === 'all') exportAll();
        else exportOne(b.dataset.size);
      }));
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undo);
    const redoBtn = document.getElementById('redoBtn');
    if (redoBtn) redoBtn.addEventListener('click', redo);
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        pushHistory();
        const fresh = makeDefaultState();
        Object.assign(state, fresh, { photos: state.photos });
        selected = 0;
        syncInputs();
        render();
      });
    }
    const flipBtn = document.getElementById('flipBtn');
    if (flipBtn) {
      flipBtn.addEventListener('click', () => {
        pushHistory();
        state.crops[selected].flip = !state.crops[selected].flip;
        render();
      });
    }
    const resetCropBtn = document.getElementById('resetCropBtn');
    if (resetCropBtn) {
      resetCropBtn.addEventListener('click', () => {
        pushHistory();
        state.crops[selected] = defaultCrop();
        render();
      });
    }
    const fillAllBtn = document.getElementById('fillAllBtn');
    if (fillAllBtn) {
      fillAllBtn.addEventListener('click', () => {
        pushHistory();
        const current = state.panelPhotos[selected];
        state.panelPhotos = state.panelPhotos.map(() => current);
        render();
      });
    }

    canvas.addEventListener('pointerdown', (e) => {
      const hit = pickPanelAt(e.clientX, e.clientY);
      if (hit < 0) return;
      if (hit !== selected) {
        selected = hit;
        syncPanelLabel();
        renderThumbs();
      }
      canvas.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, moved: false };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const crop = state.crops[selected];
      crop.ox += (e.clientX - drag.x) * scaleX;
      crop.oy += (e.clientY - drag.y) * scaleY;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.moved = true;
      render();
    });
    const endDrag = () => {
      if (drag?.moved) pushHistory();
      drag = null;
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', (e) => {
      const hit = pickPanelAt(e.clientX, e.clientY);
      if (hit < 0) return;
      e.preventDefault();
      if (hit !== selected) selected = hit;
      const crop = state.crops[selected];
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      crop.scale = Math.min(6, Math.max(0.4, crop.scale * factor));
      render();
    }, { passive: false });
    canvas.addEventListener('dblclick', (e) => {
      const hit = pickPanelAt(e.clientX, e.clientY);
      if (hit < 0) return;
      pushHistory();
      selected = hit;
      state.crops[selected] = defaultCrop();
      render();
    });
    window.addEventListener('resize', () => {
      if (shot === 'cover') render();
    });
  }

  wireEvents();
  syncInputs();
  render();
  window.__studio = api;
  return api;
}
