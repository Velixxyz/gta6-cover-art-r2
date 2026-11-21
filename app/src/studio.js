// Vice City Multi-Panel Studio — editor UI.
// Written fresh in this session. Drives the preview canvas with CoverRender;
// in ?shot=cover mode this file does nothing (shots.js owns that canvas).
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('shot') === 'cover') return;

  const R = window.CoverRender;
  const $ = function (id) { return document.getElementById(id); };

  const state = R.makeDefaultState();
  let history = [];
  let future = [];
  let selectedPanel = 0;
  let dragging = null; // {x, y} last pointer position while panning a crop
  let previewW = 1280, previewH = 720;

  function snapshot() { return JSON.stringify(state); }
  function pushHistory() {
    history.push(snapshot());
    if (history.length > 60) history.shift();
    future = [];
    refreshUndoButtons();
  }
  function restore(json) {
    const saved = JSON.parse(json);
    // Photos hold Image objects, so keep them and only restore plain fields.
    const photos = state.photos;
    Object.assign(state, saved);
    state.photos = photos;
    render();
  }
  function refreshUndoButtons() {
    $('undoBtn').disabled = history.length === 0;
    $('redoBtn').disabled = future.length === 0;
  }

  function loadImage(url, name) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve({ name: name, url: url, img: img }); };
      img.onerror = reject;
      img.src = url;
    });
  }

  function addPhotos(files) {
    const list = Array.prototype.slice.call(files || []);
    const room = 10 - state.photos.length;
    const take = list.slice(0, room);
    if (!take.length) return;
    pushHistory();
    let pending = take.length;
    take.forEach(function (file) {
      const url = URL.createObjectURL(file);
      loadImage(url, file.name).then(function (photo) {
        state.photos.push(photo);
        if (--pending === 0) { render(); }
      });
    });
  }

  function render() {
    const canvas = $('previewCanvas');
    if (!canvas) return;
    canvas.width = previewW;
    canvas.height = previewH;
    const ctx = canvas.getContext('2d');
    R.drawComicCover(ctx, state, previewW, previewH);
    renderThumbs();
    renderButtons();
    $('panelLabel').textContent = 'Panel ' + (selectedPanel + 1) + ' of ' +
      R.layoutPanels(state.layout, previewW, previewH).length + ' — ' +
      ((state.photos[state.selected] || {}).name || 'no photo');
    $('captionPreview').textContent = state.title + ' — ' + state.subtitle;
  }

  function renderThumbs() {
    const box = $('thumbList');
    box.innerHTML = '';
    state.photos.forEach(function (photo, i) {
      const d = document.createElement('div');
      d.className = 'thumb' + (i === state.selected ? ' active' : '');
      const im = document.createElement('img');
      im.src = photo.url;
      im.alt = photo.name;
      const cap = document.createElement('span');
      cap.textContent = photo.name;
      d.appendChild(im); d.appendChild(cap);
      d.addEventListener('click', function () {
        pushHistory();
        state.selected = i;
        render();
      });
      box.appendChild(d);
    });
    $('photoCount').textContent = state.photos.length + ' / 10';
  }

  function renderButtons() {
    document.querySelectorAll('[data-layout]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.layout === state.layout);
    });
    document.querySelectorAll('[data-grade]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.grade === state.grade);
    });
    document.querySelectorAll('[data-pos]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.pos === state.captionPos);
    });
  }

  function panelAt(px, py) {
    const canvas = $('previewCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = (px - rect.left) * (canvas.width / rect.width);
    const y = (py - rect.top) * (canvas.height / rect.height);
    const panels = R.layoutPanels(state.layout, canvas.width, canvas.height);
    for (let i = 0; i < panels.length; i++) {
      const p = panels[i];
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
    }
    return -1;
  }

  function cropFor(i) {
    if (!state.crops[i]) state.crops[i] = R.defaultCrop();
    return state.crops[i];
  }

  function bindCanvas() {
    const canvas = $('previewCanvas');
    canvas.addEventListener('pointerdown', function (e) {
      const i = panelAt(e.clientX, e.clientY);
      if (i < 0) return;
      selectedPanel = i;
      dragging = { x: e.clientX, y: e.clientY, moved: false };
      canvas.setPointerCapture(e.pointerId);
      render();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const dx = (e.clientX - dragging.x) * scaleX;
      const dy = (e.clientY - dragging.y) * scaleY;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragging.moved = true;
      if (dragging.moved) {
        const crop = cropFor(selectedPanel);
        const panels = R.layoutPanels(state.layout, canvas.width, canvas.height);
        const p = panels[selectedPanel];
        crop.cx = Math.min(1, Math.max(0, crop.cx - dx / p.w));
        crop.cy = Math.min(1, Math.max(0, crop.cy - dy / p.h));
        dragging.x = e.clientX; dragging.y = e.clientY;
        render();
      }
    });
    canvas.addEventListener('pointerup', function () {
      if (dragging && dragging.moved) pushHistory();
      dragging = null;
    });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      const i = panelAt(e.clientX, e.clientY);
      if (i < 0) return;
      selectedPanel = i;
      const crop = cropFor(i);
      crop.scale = Math.min(4, Math.max(0.5, crop.scale * (e.deltaY < 0 ? 1.12 : 0.89)));
      render();
    }, { passive: false });
    canvas.addEventListener('dblclick', function (e) {
      const i = panelAt(e.clientX, e.clientY);
      if (i < 0) return;
      pushHistory();
      state.crops[i] = R.defaultCrop();
      render();
    });
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  function bindControls() {
    $('addPhotosBtn').addEventListener('click', function () { $('fileInput').click(); });
    $('fileInput').addEventListener('change', function (e) { addPhotos(e.target.files); e.target.value = ''; });
    const drop = $('dropZone');
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) {
      e.preventDefault(); drop.classList.remove('over');
      addPhotos(e.dataTransfer.files);
    });
    $('fillAllBtn').addEventListener('click', function () {
      if (!state.photos.length) return;
      pushHistory();
      state.selected = state.selected; // keep selection; panels already rotate from it
      render();
    });
    document.querySelectorAll('[data-layout]').forEach(function (b) {
      b.addEventListener('click', function () { pushHistory(); state.layout = b.dataset.layout; render(); });
    });
    document.querySelectorAll('[data-grade]').forEach(function (b) {
      b.addEventListener('click', function () { pushHistory(); state.grade = b.dataset.grade; render(); });
    });
    document.querySelectorAll('[data-pos]').forEach(function (b) {
      b.addEventListener('click', function () { pushHistory(); state.captionPos = b.dataset.pos; render(); });
    });
    $('titleInput').addEventListener('input', function (e) { state.title = e.target.value.toUpperCase().slice(0, 24); render(); });
    $('subtitleInput').addEventListener('input', function (e) { state.subtitle = e.target.value.slice(0, 45); render(); });
    $('microInput').addEventListener('input', function (e) { state.micro = e.target.value; render(); });
    $('flipBtn').addEventListener('click', function () { pushHistory(); cropFor(selectedPanel).flip = !cropFor(selectedPanel).flip; render(); });
    $('resetCropBtn').addEventListener('click', function () { pushHistory(); state.crops[selectedPanel] = R.defaultCrop(); render(); });
    $('undoBtn').addEventListener('click', function () {
      if (!history.length) return;
      future.push(snapshot());
      restore(history.pop());
      refreshUndoButtons();
    });
    $('redoBtn').addEventListener('click', function () {
      if (!future.length) return;
      history.push(snapshot());
      restore(future.pop());
      refreshUndoButtons();
    });
    $('resetBtn').addEventListener('click', function () {
      pushHistory();
      const photos = state.photos;
      Object.assign(state, R.makeDefaultState());
      state.photos = photos;
      render();
    });
    $('sizeSelect').addEventListener('change', function (e) {
      const parts = e.target.value.split('x');
      previewW = parseInt(parts[0], 10);
      previewH = parseInt(parts[1], 10);
      render();
    });
    $('export1080').addEventListener('click', function () {
      R.exportCoverPng(state, 1080, 1080).then(function (b) { download(b, 'cover-1080x1080.png'); });
    });
    $('exportPortrait').addEventListener('click', function () {
      R.exportCoverPng(state, 1080, 1350).then(function (b) { download(b, 'cover-1080x1350.png'); });
    });
    $('exportWide').addEventListener('click', function () {
      R.exportCoverPng(state, 1920, 1080).then(function (b) { download(b, 'cover-1920x1080.png'); });
    });
    $('exportAll').addEventListener('click', function () {
      R.exportCoverPng(state, 1080, 1080).then(function (b) { download(b, 'cover-1080x1080.png'); });
      R.exportCoverPng(state, 1080, 1350).then(function (b) { download(b, 'cover-1080x1350.png'); });
      R.exportCoverPng(state, 1920, 1080).then(function (b) { download(b, 'cover-1920x1080.png'); });
    });
  }

  function boot() {
    bindControls();
    bindCanvas();
    refreshUndoButtons();
    Promise.all([
      loadImage('samples/pier.jpg', 'pier.jpg'),
      loadImage('samples/boulevard.jpg', 'boulevard.jpg')
    ]).then(function (photos) {
      state.photos = photos;
      render();
    }).catch(function () { render(); });
  }

  window.__studio = { state: state, render: render };
  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
