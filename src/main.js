import * as THREE from 'three';
import { Game } from './game/Game.js';
import { isTouchDevice, setupTouchControls } from './game/TouchControls.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 300);

const game = new Game({ scene, camera });

const touchDevice = isTouchDevice();
if (touchDevice) {
  setupTouchControls(game.input);
  document.body.classList.add('touch-device');
  document.querySelectorAll('.kb-only').forEach((el) => el.classList.add('hidden'));
  document.querySelectorAll('.touch-only').forEach((el) => el.classList.remove('hidden'));
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// On phones we require landscape — portrait pauses the match behind a rotate prompt.
const rotateOverlay = document.getElementById('rotate-overlay');
const portraitQuery = window.matchMedia('(orientation: portrait)');
let orientationOk = !touchDevice;

function updateOrientation() {
  if (!touchDevice) return;
  const portrait = portraitQuery.matches;
  orientationOk = !portrait;
  rotateOverlay.classList.toggle('hidden', !portrait);
  if (!portrait) onResize();
}
portraitQuery.addEventListener('change', updateOrientation);
window.addEventListener('resize', updateOrientation);
updateOrientation();

document.getElementById('btn-to-select').addEventListener('click', () => {
  if (!touchDevice) return;
  const el = document.documentElement;
  const request = el.requestFullscreen || el.webkitRequestFullscreen;
  if (request) {
    request.call(el).catch(() => {});
  }
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
});

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (orientationOk) game.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame((t) => { last = t; requestAnimationFrame(loop); });
