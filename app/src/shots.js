// Screenshot scenes (?shot=...). Reads the scene from the URL, loads the
// sample photo, applies the layout/grade/caption, waits for the Anton font,
// then marks the page ready for the headless screenshot run.
import { loadSampleAsync, setSceneFields, renderCoverScene } from "./studio.js";

async function run() {
  const params = new URLSearchParams(location.search);
  const shot = params.get("shot") || "cover";
  const scene = {
    photo: params.get("photo") || "pier.jpg",
    layout: params.get("layout") || "classic",
    grade: params.get("grade") || "sunset",
    title: params.get("title") || "Sunset Heist",
    subtitle: params.get("subtitle") || "Vice City Nights",
    micro: params.get("micro") || "Welcome to Leonida",
    position: params.get("pos") || "bottom",
  };

  try { await document.fonts.load('100px AntonCover'); } catch (e) { /* fall back */ }
  try { await document.fonts.ready; } catch (e) { /* fall back */ }

  await loadSampleAsync(scene.photo);
  setSceneFields({
    layout: scene.layout,
    grade: scene.grade,
    title: scene.title,
    subtitle: scene.subtitle,
    micro: scene.micro,
    position: scene.position,
    selectedPanel: 0,
  });

  if (shot === "cover") {
    document.body.classList.add("shot-cover");
    renderCoverScene(window.innerWidth, window.innerHeight);
  }

  window.__shotReady = true;
}

run();
