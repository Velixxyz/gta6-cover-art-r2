// shots.js — screenshot scenes for ?shot=cover and ?shot=editor.
// Loads the named sample photo, draws the cover or the compact editor,
// waits for the Anton font, then sets window.__shotReady.

(function () {
  'use strict';
  var R = window.coverRender;

  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function applyCaption(state, prefix) {
    var title = param(prefix + 'Title') || param('caption');
    var sub = param(prefix + 'Sub') || param('subtitle');
    var micro = param(prefix + 'Micro') || param('micro');
    if (title) state.caption.title = title.slice(0, 24);
    if (sub) state.caption.subtitle = sub.slice(0, 45);
    if (micro) state.caption.micro = micro.slice(0, 60);
    var pos = param('pos');
    if (pos === 'top' || pos === 'middle' || pos === 'bottom') {
      state.caption.position = pos;
    }
  }

  function ready() {
    if (document.fonts && document.fonts.load) {
      document.fonts.load('100px AntonCover').then(function () {
        window.__shotReady = true;
      }).catch(function () {
        window.__shotReady = true;
      });
      setTimeout(function () { window.__shotReady = true; }, 4000);
    } else {
      window.__shotReady = true;
    }
  }

  function waitFont() {
    if (document.fonts && document.fonts.load) {
      return Promise.race([
        document.fonts.load('100px AntonCover'),
        new Promise(function (res) { setTimeout(res, 3000); })
      ]).catch(function () {});
    }
    return Promise.resolve();
  }

  function setInput(id, value) {
    var el = document.getElementById(id);
    if (!el || value === '') return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  window.addEventListener('DOMContentLoaded', function () {
    var shot = param('shot') || 'cover';
    var photo = param('photo') || 'pier.jpg';
    var layout = param('layout') || 'classic';
    var grade = param('grade') || 'sunset';
    var state = R.makeDefaultState();
    if (R.LAYOUTS.indexOf(layout) >= 0) state.layout = layout;
    if (R.GRADES[grade]) state.grade = grade;
    applyCaption(state, 'cap');

    var canvas = document.getElementById('preview');
    var app = document.getElementById('app');

    if (shot === 'editor') {
      // The editor itself runs (studio.js). Just steer it: set the caption
      // from the query, pick the requested photo's thumbnail, keep every
      // control visible, then flag ready once the font is in.
      document.body.classList.add('shot-editor');
      setInput('titleInput', state.caption.title);
      setInput('subInput', state.caption.subtitle);
      setInput('microInput', state.caption.micro);
      var thumbs = document.querySelectorAll('.thumb');
      for (var i = 0; i < thumbs.length; i++) {
        if ((thumbs[i].title || '') === photo) {
          thumbs[i].click();
          break;
        }
      }
      var strip = document.getElementById('shotStrip');
      if (strip) {
        strip.style.display = 'block';
        strip.textContent = state.caption.title + '  —  ' + state.caption.subtitle;
      }
      if (app) app.classList.add('shot-ready');
      waitFont().then(function () {
        // One last draw with the font actually loaded, so the lettering
        // measures and renders in Anton, not a fallback.
        var evt = new Event('input', { bubbles: true });
        var t = document.getElementById('titleInput');
        if (t) t.dispatchEvent(evt);
        ready();
      });
      return;
    }

    // Cover scene: wait for the font first (so auto-fit measures in Anton),
    // then load the photo and draw the cover full-frame.
    waitFont().then(function () {
      return loadImage('samples/' + photo);
    }).then(function (img) {
      var photos = img ? [{ name: photo, url: 'samples/' + photo, img: img }] : [];
      document.body.classList.add('shot-cover');
      var w = parseInt(param('w') || '1280', 10);
      var h = parseInt(param('h') || '720', 10);
      canvas.width = w;
      canvas.height = h;
      var ctx2 = canvas.getContext('2d');
      R.drawComicCover(ctx2, state, photos, w, h);
      if (app) app.classList.add('shot-ready');
      ready();
    });
  });
})();
