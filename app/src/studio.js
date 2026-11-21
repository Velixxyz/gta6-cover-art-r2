// studio.js — Vice City Multi-Panel Studio editor.
// Wires the DOM controls to coverRender.js. The preview canvas uses the
// same drawComicCover() the PNG export uses.

(function () {
  'use strict';
  var R = window.coverRender;

  var state = R.makeDefaultState();
  var photos = []; // {name, url, img}
  var selectedPanel = 0;
  var history = [];
  var future = [];
  var previewSize = { w: 1280, h: 720 };

  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------- undo/redo
  function snapshot() {
    return JSON.stringify({
      layout: state.layout, grade: state.grade, seed: state.seed,
      caption: state.caption, photoIndex: state.photoIndex, crops: state.crops
    });
  }
  function pushHistory() {
    history.push(snapshot());
    if (history.length > 60) history.shift();
    future.length = 0;
    refreshUndoButtons();
  }
  function restore(json) {
    var s = JSON.parse(json);
    state.layout = s.layout; state.grade = s.grade; state.seed = s.seed;
    state.caption = s.caption; state.photoIndex = s.photoIndex; state.crops = s.crops;
    syncControls();
    draw();
  }
  function undo() {
    if (!history.length) return;
    future.push(snapshot());
    restore(history.pop());
    refreshUndoButtons();
  }
  function redo() {
    if (!future.length) return;
    history.push(snapshot());
    restore(future.pop());
    refreshUndoButtons();
  }
  function refreshUndoButtons() {
    $('undoBtn').disabled = !history.length;
    $('redoBtn').disabled = !future.length;
  }

  // ---------------------------------------------------------------- photos
  function addPhotoFiles(files) {
    var list = Array.prototype.slice.call(files || []);
    var added = 0;
    list.forEach(function (f) {
      if (!f || !/^image\//.test(f.type)) return;
      if (photos.length >= 10) return;
      var url = URL.createObjectURL(f);
      var img = new Image();
      img.onload = function () { draw(); };
      img.src = url;
      photos.push({ name: f.name, url: url, img: img });
      added++;
    });
    if (added) { pushHistory(); renderThumbs(); draw(); }
  }

  function loadSample(name, url) {
    var img = new Image();
    img.onload = function () { draw(); };
    img.src = url;
    photos.push({ name: name, url: url, img: img });
  }

  function renderThumbs() {
    var box = $('thumbs');
    box.innerHTML = '';
    photos.forEach(function (p, i) {
      var d = document.createElement('div');
      d.className = 'thumb' + (i === state.photoIndex ? ' active' : '');
      d.title = p.name;
      var im = document.createElement('img');
      im.src = p.url;
      im.alt = p.name;
      var lab = document.createElement('span');
      lab.textContent = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
      d.appendChild(im);
      d.appendChild(lab);
      d.addEventListener('click', function () {
        pushHistory();
        state.photoIndex = i;
        renderThumbs();
        draw();
      });
      box.appendChild(d);
    });
    $('photoCount').textContent = photos.length + ' / 10';
  }

  // ---------------------------------------------------------------- drawing
  function draw() {
    var canvas = $('preview');
    canvas.width = previewSize.w;
    canvas.height = previewSize.h;
    var ctx = canvas.getContext('2d');
    R.drawComicCover(ctx, state, photos, previewSize.w, previewSize.h);
    var panels = R.layoutPanels(state.layout, previewSize.w, previewSize.h);
    var p = panels[selectedPanel] || panels[0];
    var label = 'Panel ' + (selectedPanel + 1) + ' of ' + panels.length;
    if (photos.length) label += ' — ' + photos[state.photoIndex % photos.length].name;
    $('panelLabel').textContent = label;
  }

  // -------------------------------------------------------------- controls
  function syncControls() {
    document.querySelectorAll('[data-layout]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-layout') === state.layout);
    });
    document.querySelectorAll('[data-grade]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-grade') === state.grade);
    });
    document.querySelectorAll('[data-pos]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-pos') === state.caption.position);
    });
    $('titleInput').value = state.caption.title;
    $('subInput').value = state.caption.subtitle;
    $('microInput').value = state.caption.micro;
    renderThumbs();
  }

  function bind() {
    $('addPhotos').addEventListener('click', function () { $('fileInput').click(); });
    $('fileInput').addEventListener('change', function (e) {
      addPhotoFiles(e.target.files);
      e.target.value = '';
    });
    var dz = $('dropZone');
    dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', function () { dz.classList.remove('over'); });
    dz.addEventListener('drop', function (e) {
      e.preventDefault();
      dz.classList.remove('over');
      addPhotoFiles(e.dataTransfer.files);
    });
    $('fillAll').addEventListener('click', function () {
      if (!photos.length) return;
      pushHistory();
      state.photoIndex = state.photoIndex % photos.length;
      draw();
    });

    document.querySelectorAll('[data-layout]').forEach(function (b) {
      b.addEventListener('click', function () {
        pushHistory();
        state.layout = b.getAttribute('data-layout');
        selectedPanel = 0;
        syncControls();
        draw();
      });
    });
    document.querySelectorAll('[data-grade]').forEach(function (b) {
      b.addEventListener('click', function () {
        pushHistory();
        state.grade = b.getAttribute('data-grade');
        syncControls();
        draw();
      });
    });
    document.querySelectorAll('[data-pos]').forEach(function (b) {
      b.addEventListener('click', function () {
        pushHistory();
        state.caption.position = b.getAttribute('data-pos');
        syncControls();
        draw();
      });
    });

    $('titleInput').addEventListener('input', function (e) {
      state.caption.title = e.target.value.slice(0, 24);
      draw();
    });
    $('subInput').addEventListener('input', function (e) {
      state.caption.subtitle = e.target.value.slice(0, 45);
      draw();
    });
    $('microInput').addEventListener('input', function (e) {
      state.caption.micro = e.target.value.slice(0, 60);
      draw();
    });
    [$('titleInput'), $('subInput'), $('microInput')].forEach(function (el) {
      el.addEventListener('change', pushHistory);
    });

    // Per-panel crop: click a panel to select it, drag to pan, wheel to zoom.
    var canvas = $('preview');
    var dragging = null;
    function panelAt(mx, my) {
      var r = canvas.getBoundingClientRect();
      var sx = canvas.width / r.width, sy = canvas.height / r.height;
      var x = (mx - r.left) * sx, y = (my - r.top) * sy;
      var panels = R.layoutPanels(state.layout, canvas.width, canvas.height);
      for (var i = 0; i < panels.length; i++) {
        var p = panels[i];
        if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
      }
      return -1;
    }
    function cropFor(i) {
      if (!state.crops[i]) state.crops[i] = R.defaultCrop();
      return state.crops[i];
    }
    canvas.addEventListener('mousedown', function (e) {
      var i = panelAt(e.clientX, e.clientY);
      if (i < 0) return;
      selectedPanel = i;
      dragging = { x: e.clientX, y: e.clientY, moved: false };
      draw();
    });
    canvas.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragging.moved = true;
      if (!dragging.moved) return;
      var c = cropFor(selectedPanel);
      var r = canvas.getBoundingClientRect();
      c.x = Math.max(-1, Math.min(1, c.x + dx / r.width * 1.6));
      c.y = Math.max(-1, Math.min(1, c.y + dy / r.height * 1.6));
      dragging.x = e.clientX; dragging.y = e.clientY;
      draw();
    });
    window.addEventListener('mouseup', function () {
      if (dragging && dragging.moved) pushHistory();
      dragging = null;
    });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var i = panelAt(e.clientX, e.clientY);
      if (i < 0) return;
      selectedPanel = i;
      var c = cropFor(i);
      c.zoom = Math.max(1, Math.min(3.5, c.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      draw();
    }, { passive: false });
    canvas.addEventListener('dblclick', function (e) {
      var i = panelAt(e.clientX, e.clientY);
      if (i < 0) return;
      pushHistory();
      state.crops[i] = R.defaultCrop();
      draw();
    });
    $('flipBtn').addEventListener('click', function () {
      pushHistory();
      var c = cropFor(selectedPanel);
      c.flip = !c.flip;
      draw();
    });
    $('resetCropBtn').addEventListener('click', function () {
      pushHistory();
      state.crops[selectedPanel] = R.defaultCrop();
      draw();
    });

    $('undoBtn').addEventListener('click', undo);
    $('redoBtn').addEventListener('click', redo);
    $('resetBtn').addEventListener('click', function () {
      pushHistory();
      var keepPhotos = photos;
      state = R.makeDefaultState();
      photos = keepPhotos;
      selectedPanel = 0;
      syncControls();
      draw();
    });

    $('sizeSelect').addEventListener('change', function (e) {
      var parts = e.target.value.split('x');
      previewSize = { w: parseInt(parts[0], 10), h: parseInt(parts[1], 10) };
      draw();
    });

    // Export.
    function download(canvas, name) {
      canvas.toBlob(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      }, 'image/png');
    }
    $('expSquare').addEventListener('click', function () {
      download(R.exportCoverPng(state, photos, 1080, 1080), 'vice-city-cover-1080x1080.png');
    });
    $('expPortrait').addEventListener('click', function () {
      download(R.exportCoverPng(state, photos, 1080, 1350), 'vice-city-cover-1080x1350.png');
    });
    $('expWide').addEventListener('click', function () {
      download(R.exportCoverPng(state, photos, 1920, 1080), 'vice-city-cover-1920x1080.png');
    });
    $('expAll').addEventListener('click', function () {
      download(R.exportCoverPng(state, photos, 1080, 1080), 'vice-city-cover-1080x1080.png');
      download(R.exportCoverPng(state, photos, 1080, 1350), 'vice-city-cover-1080x1350.png');
      download(R.exportCoverPng(state, photos, 1920, 1080), 'vice-city-cover-1920x1080.png');
    });
  }

  // ------------------------------------------------------------------ init
  // In ?shot=cover mode the shots script owns the canvas, so the editor
  // must not load samples or draw over it. In ?shot=editor mode the
  // editor runs normally and the shots script only tweaks its controls.
  var SHOT_MODE = (/[?&]shot=([^&]*)/.exec(window.location.search) || [])[1] || '';

  window.addEventListener('DOMContentLoaded', function () {
    bind();
    if (SHOT_MODE !== 'cover') {
      loadSample('pier.jpg', 'samples/pier.jpg');
      loadSample('boulevard.jpg', 'samples/boulevard.jpg');
    }
    syncControls();
    refreshUndoButtons();
    if (SHOT_MODE !== 'cover') draw();
  });
})();
