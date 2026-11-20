// Shot scenes: reproducible screenshots for the entry.
// ?shot=cover&photo=pier&caption=Sunset%20Heist  → the exported cover, full screen
// ?shot=editor&photo=boulevard&caption=Boulevard%20Queen → the editor with a photo loaded
// Every scene ends by setting window.__shotReady after the cover has painted,
// so a screenshot tool can wait for it instead of guessing a delay.

import { createStudio } from './studio.js';

function readShotParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot') || '',
    photo: q.get('photo') || 'pier',
    caption: q.get('caption') || '',
    subtitle: q.get('subtitle') || '',
    layout: q.get('layout') || 'classic',
    grade: q.get('grade') || 'sunset',
    size: q.get('size') || '',
    pos: q.get('pos') || 'bottom',
  };
}

async function runShotScene() {
  const params = readShotParams();
  const studio = createStudio(document);
  window.__studio = studio;
  const state = studio.state;
  if (params.caption) state.title = params.caption.slice(0, 24);
  if (params.subtitle) state.subtitle = params.subtitle.slice(0, 45);
  if (params.layout) state.layout = params.layout;
  if (params.grade) state.grade = params.grade;
  if (params.pos) state.captionPos = params.pos;
  if (params.size) state.exportSize = params.size;
  if (params.shot === 'cover') {
    document.body.classList.add('shot-cover');
    if (!params.size) state.exportSize = '1920x1080';
  }
  try {
    await studio.loadSamplePhoto(params.photo);
  } catch (err) {
    // A missing sample still leaves a sunset cover with palms, never a blank page.
    studio.setStatus('Sample photo unavailable — showing the sunset cover.');
  }
  if (params.shot === 'cover' && !params.caption) state.title = 'Sunset Heist';
  if (params.shot === 'cover' && !params.subtitle) state.subtitle = 'Vice City Nights';
  // Wait for the display face before the final paint: lettering must be Anton.
  try {
    await document.fonts.load('100px AntonCover');
    await document.fonts.ready;
  } catch (err) { /* fall back to the system condensed face */ }
  studio.renderPreview();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runShotScene);
} else {
  runShotScene();
}
