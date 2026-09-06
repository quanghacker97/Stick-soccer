import * as THREE from 'three';
import {
  FIELD_LENGTH, FIELD_WIDTH, GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH,
  PENALTY_DEPTH, PENALTY_WIDTH,
} from './constants.js';

function buildSky(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 2; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#3e86d6');
  grad.addColorStop(0.55, '#8fd0ff');
  grad.addColorStop(1, '#e8f6ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.SphereGeometry(150, 20, 20);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
}

function buildCrowdTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#25242b';
  ctx.fillRect(0, 0, 128, 32);
  const colors = ['#e74c3c', '#f1c40f', '#3498db', '#ecf0f1', '#2ecc71', '#e67e22'];
  for (let y = 2; y < 32; y += 4) {
    for (let x = 0; x < 128; x += 4) {
      ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
      ctx.fillRect(x + Math.random() * 1.5, y + Math.random() * 1.5, 2.4, 2.6);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildPitchTexture() {
  const res = 6; // px per world unit
  const w = Math.ceil(FIELD_WIDTH * res) + 40;
  const h = Math.ceil(FIELD_LENGTH * res) + 40;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3f9142';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#469b49';
  const stripe = FIELD_LENGTH * res / 12;
  for (let i = 0; i < 12; i += 2) {
    ctx.fillRect(0, 20 + i * stripe, w, stripe);
  }

  const ox = w / 2, oz = h / 2;
  const toX = (x) => ox + x * res;
  const toZ = (z) => oz + z * res;

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;

  // outer boundary
  ctx.strokeRect(toX(-FIELD_WIDTH / 2), toZ(-FIELD_LENGTH / 2), FIELD_WIDTH * res, FIELD_LENGTH * res);
  // halfway line
  ctx.beginPath();
  ctx.moveTo(toX(-FIELD_WIDTH / 2), toZ(0));
  ctx.lineTo(toX(FIELD_WIDTH / 2), toZ(0));
  ctx.stroke();
  // center circle
  ctx.beginPath();
  ctx.arc(toX(0), toZ(0), 5 * res, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(toX(0), toZ(0), 0.3 * res, 0, Math.PI * 2);
  ctx.fill();

  // penalty boxes (both ends)
  for (const sign of [-1, 1]) {
    const zEdge = sign * FIELD_LENGTH / 2;
    const zInner = zEdge - sign * PENALTY_DEPTH;
    ctx.strokeRect(toX(-PENALTY_WIDTH / 2), toZ(Math.min(zEdge, zInner)), PENALTY_WIDTH * res, PENALTY_DEPTH * res);
    ctx.beginPath();
    ctx.arc(toX(0), toZ(zEdge), 4 * res, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function buildGoal(scene, zSide) {
  const group = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4 });
  const postR = 0.09;
  const halfW = GOAL_WIDTH / 2;

  const postGeo = new THREE.CylinderGeometry(postR, postR, GOAL_HEIGHT, 10);
  const left = new THREE.Mesh(postGeo, postMat);
  left.position.set(-halfW, GOAL_HEIGHT / 2, 0);
  const right = new THREE.Mesh(postGeo, postMat);
  right.position.set(halfW, GOAL_HEIGHT / 2, 0);
  group.add(left, right);

  const crossGeo = new THREE.CylinderGeometry(postR, postR, GOAL_WIDTH, 10);
  const cross = new THREE.Mesh(crossGeo, postMat);
  cross.rotation.z = Math.PI / 2;
  cross.position.set(0, GOAL_HEIGHT, 0);
  group.add(cross);

  // back supports
  for (const sign of [-1, 1]) {
    const back = new THREE.Mesh(postGeo, postMat);
    back.position.set(sign * halfW, GOAL_HEIGHT / 2, -zSide * GOAL_DEPTH);
    group.add(back);
    const diagGeo = new THREE.CylinderGeometry(postR * 0.7, postR * 0.7, Math.hypot(GOAL_HEIGHT, GOAL_DEPTH), 8);
    const diag = new THREE.Mesh(diagGeo, postMat);
    diag.position.set(sign * halfW, GOAL_HEIGHT / 2, -zSide * GOAL_DEPTH / 2);
    diag.rotation.x = zSide * Math.atan2(GOAL_DEPTH, GOAL_HEIGHT);
    group.add(diag);
  }

  const netMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, wireframe: true,
  });
  const backNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_HEIGHT, 10, 6), netMat);
  backNet.position.set(0, GOAL_HEIGHT / 2, -zSide * GOAL_DEPTH);
  group.add(backNet);
  const topNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_DEPTH, 10, 4), netMat);
  topNet.rotation.x = Math.PI / 2;
  topNet.position.set(0, GOAL_HEIGHT, -zSide * GOAL_DEPTH / 2);
  group.add(topNet);
  for (const sign of [-1, 1]) {
    const sideNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT, 4, 6), netMat);
    sideNet.rotation.y = Math.PI / 2;
    sideNet.position.set(sign * halfW, GOAL_HEIGHT / 2, -zSide * GOAL_DEPTH / 2);
    group.add(sideNet);
  }

  group.position.z = zSide * FIELD_LENGTH / 2;
  scene.add(group);
  return group;
}

function buildStands(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x5b4a36, roughness: 0.9 });
  const crowdTex = buildCrowdTexture();
  const margin = 6;

  for (const isSide of [true, false]) {
    for (const sign of [-1, 1]) {
      const len = isSide ? FIELD_LENGTH + margin * 2 : FIELD_WIDTH + margin * 2;
      const stand = new THREE.Mesh(new THREE.BoxGeometry(isSide ? 4 : len, 5, isSide ? len : 4), mat);

      const tex = crowdTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set((len - 1) / 6, 1);
      const seatMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
      const seats = new THREE.Mesh(new THREE.BoxGeometry(isSide ? 3.6 : len - 1, 2.4, isSide ? len - 1 : 3.6), seatMat);

      const dist = (isSide ? FIELD_WIDTH : FIELD_LENGTH) / 2 + margin + 3;
      if (isSide) {
        stand.position.set(sign * dist, 2.5, 0);
        seats.position.set(sign * dist, 5.7, 0);
      } else {
        stand.position.set(0, 2.5, sign * dist);
        seats.position.set(0, 5.7, sign * dist);
      }
      group.add(stand, seats);
    }
  }
  scene.add(group);
}

function buildPagoda(scene, x, z) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a4b2a, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9a2e2e, roughness: 0.7 });
  let y = 0;
  for (let i = 0; i < 3; i++) {
    const s = 3.2 - i * 0.7;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(s, s, 1.8, 8), mat);
    body.position.y = y + 0.9;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(s + 0.6, 1, 8), roofMat);
    roof.position.y = y + 1.8 + 0.5;
    group.add(body, roof);
    y += 1.8 + 1;
  }
  group.position.set(x, 0, z);
  scene.add(group);
}

export function createField(scene) {
  const groundGeo = new THREE.PlaneGeometry(FIELD_WIDTH + 20, FIELD_LENGTH + 20);
  const tex = buildPitchTexture();
  const groundMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  buildGoal(scene, -1);
  buildGoal(scene, 1);
  buildStands(scene);
  buildSky(scene);
  buildPagoda(scene, -(FIELD_WIDTH / 2 + 16), -(FIELD_LENGTH / 2 + 10));
  buildPagoda(scene, FIELD_WIDTH / 2 + 16, FIELD_LENGTH / 2 + 10);

  const hemi = new THREE.HemisphereLight(0xcfe9ff, 0x3f9142, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6e0, 1.5);
  sun.position.set(20, 30, 10);
  scene.add(sun);
  const fillLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(fillLight);

  scene.fog = new THREE.Fog(0xcfe9ff, 70, 140);
}
