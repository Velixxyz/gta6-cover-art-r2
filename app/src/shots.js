// Fixed scenes for screenshots: ?shot=cover draws the cover alone, full-frame;
// ?shot=editor shows the editor with a sample photo loaded. `photo` picks the
// sample (samples/<photo>.jpg), `caption` the title words, `grade` and
// `layout` optionally pick the grade and layout. window.__shotReady is set
// once the scene has painted, after the Anton font has actually loaded.

export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') {
    document.body.classList.add('shot-editor');
    api.setPreviewSize('wide');
  }
  try {
    await document.fonts.load('100px AntonCover');
    await document.fonts.ready;
  } catch (e) {
    // Fall back to the system sans: the cover still renders.
  }
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const extra = {};
  if (query.get('grade')) extra.grade = query.get('grade');
  if (query.get('layout')) extra.layout = query.get('layout');
  await api.loadSample(photo, caption, extra);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
