// Vice City Multi-Panel Studio — editor (browser only, photos stay local).
// Wires the controls to the same drawComicCover the export uses, so the
// preview on screen is exactly the PNG that gets downloaded.

import {
  GRADES, LAYOUTS, DEFAULT_CROPS, layoutPanels,
  drawComicCover, exportCoverPng,
} from "./coverRender.js";

const $ = (id) => document.getElementById(id);

const state = {
  photos: [],          // HTMLImageElement list, in load order
  photoNames: [],
  layout: "classic",
  grade: "sunset",
  title: "Sunset Heist",
  subtitle: "Vice City Nights",
  micro: "Welcome to Leonida",
  position: "bottom",
  crops: JSON.parse(JSON.stringify(DEFAULT_CROPS)),
  selectedPanel: 0,
};

const undoStack = [];
const redoStack = [];

function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade,
    title: state.title, subtitle: state.subtitle, micro: state.micro,
    position: state.position, crops: state.crops,
    selectedPanel: state.selectedPanel,
  });
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 40) undoStack.shift();
  redoStack.length = 0;
}

function applySnapshot(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  syncControls();
  renderPreview();
}

function syncControls() {
  $("layoutSelect").value = state.layout;
  $("gradeSelect").value = state.grade;
  $("titleInput").value = state.title;
  $("subtitleInput").value = state.subtitle;
  $("microInput").value = state.micro;
  $("posSelect").value = state.position;
}

function renderPreview() {
  const canvas = $("preview");
  if (!canvas) return;
  const W = 960;
  const H = 540;
  drawComicCover(canvas, {
    width: W, height: H,
    photos: state.photos,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    micro: state.micro,
    position: state.position,
    crops: state.crops,
  });
  renderThumbs();
  highlightPanel();
}

function renderThumbs() {
  const box = $("thumbs");
  if (!box) return;
  box.innerHTML = "";
  state.photos.forEach((img, i) => {
    const t = document.createElement("img");
    t.src = img.src;
    t.alt = state.photoNames[i] || `photo ${i + 1}`;
    t.className = "thumb";
    t.title = "Click: use this photo in every panel";
    t.addEventListener("click", () => {
      pushUndo();
      const picked = state.photos[i];
      state.photos = [picked];
      renderPreview();
    });
    box.appendChild(t);
  });
  if (state.photos.length === 0) {
    box.textContent = "No photos yet — drop your own photos, or use a sample below.";
  }
}

function highlightPanel() {
  const canvas = $("preview");
  if (!canvas) return;
  const panels = layoutPanels(state.layout, 960, 540);
  const p = panels[state.selectedPanel] || panels[0];
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.strokeStyle = "#ffd23e";
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 8]);
  ctx.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);
  ctx.restore();
}

function loadFiles(files) {
  const list = Array.from(files || []).filter((f) => f.type.startsWith("image/"));
  if (list.length === 0) return;
  pushUndo();
  let pending = list.length;
  list.forEach((file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.photos.push(img);
      state.photoNames.push(file.name);
      if (state.photos.length > 10) {
        state.photos.shift();
        state.photoNames.shift();
      }
      if (--pending === 0) renderPreview();
    };
    img.onerror = () => { if (--pending === 0) renderPreview(); };
    img.src = url;
  });
}

function loadSample(name) {
  pushUndo();
  const img = new Image();
  img.onload = () => {
    state.photos = [img];
    state.photoNames = [name];
    renderPreview();
  };
  img.src = `samples/${name}`;
}

function currentOpts(width, height) {
  return {
    width, height,
    photos: state.photos,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    micro: state.micro,
    position: state.position,
    crops: state.crops,
  };
}

function downloadPng(width, height, filename) {
  const url = exportCoverPng(currentOpts(width, height));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

function exportAllSizes() {
  downloadPng(1080, 1080, "vice-city-cover-1080x1080.png");
  downloadPng(1080, 1350, "vice-city-cover-1080x1350.png");
  downloadPng(1920, 1080, "vice-city-cover-1920x1080.png");
}

function resetCrops() {
  pushUndo();
  state.crops = JSON.parse(JSON.stringify(DEFAULT_CROPS));
  renderPreview();
}

function panelAt(clientX, clientY) {
  const canvas = $("preview");
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 960;
  const y = ((clientY - rect.top) / rect.height) * 540;
  const panels = layoutPanels(state.layout, 960, 540);
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return i;
  }
  return 0;
}

function init() {
  const layoutSelect = $("layoutSelect");
  Object.entries(LAYOUTS).forEach(([key, layout]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = layout.name;
    layoutSelect.appendChild(opt);
  });
  layoutSelect.value = state.layout;

  const gradeSelect = $("gradeSelect");
  Object.entries(GRADES).forEach(([key, grade]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = grade.name;
    gradeSelect.appendChild(opt);
  });
  gradeSelect.value = state.grade;

  layoutSelect.addEventListener("change", () => { pushUndo(); state.layout = layoutSelect.value; state.selectedPanel = 0; renderPreview(); });
  gradeSelect.addEventListener("change", () => { pushUndo(); state.grade = gradeSelect.value; renderPreview(); });
  $("titleInput").addEventListener("input", (e) => { state.title = e.target.value; renderPreview(); });
  $("subtitleInput").addEventListener("input", (e) => { state.subtitle = e.target.value; renderPreview(); });
  $("microInput").addEventListener("input", (e) => { state.micro = e.target.value; renderPreview(); });
  $("posSelect").addEventListener("change", (e) => { pushUndo(); state.position = e.target.value; renderPreview(); });

  const input = $("photoInput");
  input.addEventListener("change", () => { loadFiles(input.files); input.value = ""; });
  const drop = $("dropZone");
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("drag"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("drag");
    loadFiles(e.dataTransfer.files);
  });

  document.querySelectorAll("[data-sample]").forEach((btn) => {
    btn.addEventListener("click", () => loadSample(btn.dataset.sample));
  });
  document.querySelectorAll("[data-flip]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pushUndo();
      const c = state.crops[state.selectedPanel] || state.crops[0];
      c.flip = !c.flip;
      renderPreview();
    });
  });

  $("undoBtn").addEventListener("click", () => {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    applySnapshot(undoStack.pop());
  });
  $("redoBtn").addEventListener("click", () => {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    applySnapshot(redoStack.pop());
  });
  $("resetBtn").addEventListener("click", resetCrops);
  $("resetAllBtn").addEventListener("click", () => {
    pushUndo();
    Object.assign(state, {
      layout: "classic", grade: "sunset",
      title: "Sunset Heist", subtitle: "Vice City Nights",
      micro: "Welcome to Leonida", position: "bottom",
      crops: JSON.parse(JSON.stringify(DEFAULT_CROPS)),
      selectedPanel: 0,
    });
    syncControls();
    renderPreview();
  });

  $("exportSquare").addEventListener("click", () => downloadPng(1080, 1080, "vice-city-cover-1080x1080.png"));
  $("exportPortrait").addEventListener("click", () => downloadPng(1080, 1350, "vice-city-cover-1080x1350.png"));
  $("exportWide").addEventListener("click", () => downloadPng(1920, 1080, "vice-city-cover-1920x1080.png"));
  $("exportAll").addEventListener("click", exportAllSizes);

  const canvas = $("preview");
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    pushUndo();
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    state.selectedPanel = panelAt(e.clientX, e.clientY);
    canvas.setPointerCapture(e.pointerId);
    renderPreview();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - lastX) / rect.width;
    const dy = (e.clientY - lastY) / rect.height;
    lastX = e.clientX;
    lastY = e.clientY;
    const c = state.crops[state.selectedPanel] || state.crops[0];
    c.cx = Math.min(1, Math.max(0, c.cx - dx));
    c.cy = Math.min(1, Math.max(0, c.cy - dy));
    renderPreview();
  });
  canvas.addEventListener("pointerup", () => { dragging = false; });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    pushUndo();
    const c = state.crops[state.selectedPanel] || state.crops[0];
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    c.zoom = Math.min(4, Math.max(1, (c.zoom || 1) * factor));
    renderPreview();
  }, { passive: false });
  canvas.addEventListener("dblclick", () => {
    pushUndo();
    state.crops[state.selectedPanel] = JSON.parse(JSON.stringify(DEFAULT_CROPS[state.selectedPanel] || DEFAULT_CROPS[0]));
    renderPreview();
  });

  syncControls();
  // Screenshot scenes (?shot=...) load their own photo via shots.js.
  if (!new URLSearchParams(location.search).has("shot")) {
    loadSample("pier.jpg");
  } else {
    renderPreview();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Scene API for shots.js: load one sample photo, set the editor fields,
// or render a full-size cover for a screenshot scene.
export function loadSampleAsync(name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      state.photos = [img];
      state.photoNames = [name];
      renderPreview();
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = `samples/${name}`;
  });
}

export function setSceneFields(fields) {
  Object.assign(state, fields);
  syncControls();
  renderPreview();
}

export function renderCoverScene(width, height) {
  const canvas = $("preview");
  drawComicCover(canvas, {
    width, height,
    photos: state.photos,
    layout: state.layout, grade: state.grade,
    title: state.title, subtitle: state.subtitle, micro: state.micro,
    position: state.position, crops: state.crops,
  });
}
