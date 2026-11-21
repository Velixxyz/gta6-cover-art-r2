// Screenshot scenes for ?shot=cover and ?shot=editor.
// Written fresh in this session. Sets window.__shotReady once the scene is drawn.
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return;
  const R = window.CoverRender;

  function loadImage(url, name) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve({ name: name, url: url, img: img }); };
      img.onerror = reject;
      img.src = url;
    });
  }

  function markReady() { window.__shotReady = true; }

  function drawCoverScene() {
    const W = parseInt(q.get('w') || window.innerWidth, 10);
    const H = parseInt(q.get('h') || window.innerHeight, 10);
    const state = R.makeDefaultState();
    state.title = (q.get('title') || 'SUNSET HEIST').toUpperCase().slice(0, 24);
    state.subtitle = (q.get('subtitle') || state.subtitle).slice(0, 45);
    state.micro = q.get('micro') || state.micro;
    state.layout = q.get('layout') || 'classic';
    state.grade = q.get('grade') || 'sunset';
    state.captionPos = q.get('pos') || 'bottom';
    const photoName = q.get('photo') || 'pier.jpg';
    const second = q.get('photo2') || 'boulevard.jpg';

    document.body.classList.add('shot-cover');
    const canvas = document.getElementById('previewCanvas');
    canvas.width = W;
    canvas.height = H;

    let done = false;
    const finish = function () {
      if (done) return;
      done = true;
      const ctx = canvas.getContext('2d');
      R.drawComicCover(ctx, state, W, H);
      markReady();
    };
    // Safety net: never leave the shooter hanging.
    setTimeout(finish, 8000);

    Promise.all([
      document.fonts.load('100px AntonCover').catch(function () {}),
      loadImage('samples/' + photoName, photoName).catch(function () { return null; }),
      loadImage('samples/' + second, second).catch(function () { return null; })
    ]).then(function (results) {
      const photos = results.slice(1).filter(Boolean);
      if (photos.length) {
        state.photos = photos;
        state.selected = 0;
      }
      // Give the font a tick to apply, then draw.
      setTimeout(finish, 120);
    });
  }

  function driveEditorScene() {
    const title = q.get('title') || 'BOULEVARD QUEEN';
    const photoName = q.get('photo') || 'boulevard.jpg';
    let tries = 0;
    const tick = function () {
      tries++;
      const studio = window.__studio;
      const thumbs = document.querySelectorAll('.thumb');
      if (!studio || !studio.state.photos.length || tries > 120) {
        markReady();
        return;
      }
      const idx = studio.state.photos.findIndex(function (p) { return p.name === photoName; });
      if (idx >= 0 && studio.state.selected !== idx) {
        studio.state.selected = idx;
      }
      studio.state.title = title.toUpperCase().slice(0, 24);
      const titleInput = document.getElementById('titleInput');
      if (titleInput) titleInput.value = studio.state.title;
      const sub = document.getElementById('subtitleInput');
      if (sub && q.get('subtitle')) {
        studio.state.subtitle = q.get('subtitle').slice(0, 45);
        sub.value = studio.state.subtitle;
      }
      studio.render();
      setTimeout(markReady, 350);
    };
    setTimeout(tick, 400);
  }

  if (shot === 'cover') drawCoverScene();
  else if (shot === 'editor') driveEditorScene();
})();
