import * as THREE from 'three';
import { BALL_RADIUS, GRAVITY, GROUND_FRICTION, FIELD_WIDTH, FIELD_LENGTH } from './constants.js';

function buildBallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#20242a';

  function pentagon(cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  const rows = [16, 48, 80, 112];
  rows.forEach((y, ri) => {
    const offset = ri % 2 === 0 ? 0 : 32;
    for (let x = offset; x < 256 + 32; x += 64) pentagon(x, y, 15);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

let sharedGeo = null;
let sharedTex = null;

export class Ball {
  constructor(scene) {
    if (!sharedGeo) sharedGeo = new THREE.SphereGeometry(BALL_RADIUS, 20, 16);
    if (!sharedTex) sharedTex = buildBallTexture();
    const mat = new THREE.MeshStandardMaterial({ map: sharedTex, roughness: 0.5 });
    this.mesh = new THREE.Mesh(sharedGeo, mat);
    this.mesh.position.set(0, BALL_RADIUS, 0);
    scene.add(this.mesh);

    const shadowGeo = new THREE.CircleGeometry(BALL_RADIUS * 1.3, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    scene.add(this.shadow);

    this.velocity = new THREE.Vector3();
    this.special = null;
    this.lastTouch = null; // { player, team }
    this.groundHits = 0;
    this.trailTimer = 0;
  }

  get position() { return this.mesh.position; }

  reset(pos = new THREE.Vector3(0, BALL_RADIUS + 3, 0)) {
    this.mesh.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.special = null;
    this.lastTouch = null;
    this.groundHits = 0;
  }

  isGrounded() {
    return this.mesh.position.y <= BALL_RADIUS + 0.03;
  }

  update(dt, particles) {
    const p = this.mesh.position;
    const v = this.velocity;

    if (this.special) {
      this.updateSpecial(dt, particles);
    } else {
      v.y += GRAVITY * dt;
    }

    p.addScaledVector(v, dt);

    // spin visual
    if (v.lengthSq() > 0.01) {
      const axis = new THREE.Vector3(-v.z, 0, v.x).normalize();
      this.mesh.rotateOnWorldAxis(axis, v.length() * dt / BALL_RADIUS);
    }

    // ground bounce
    if (p.y - BALL_RADIUS < 0) {
      p.y = BALL_RADIUS;
      v.y *= -0.48;
      v.x *= 0.86;
      v.z *= 0.86;
      this.groundHits++;
      if (Math.abs(v.y) < 0.7) v.y = 0;
      if (this.special && this.groundHits >= 2) this.special = null;
    }

    // rolling friction
    if (this.isGrounded()) {
      const speed = Math.hypot(v.x, v.z);
      if (speed > 0) {
        const drop = Math.min(speed, GROUND_FRICTION * dt);
        const scale = (speed - drop) / speed;
        v.x *= scale; v.z *= scale;
      }
    }

    // side boundaries (simplified — keep it bouncing back into play)
    const halfW = FIELD_WIDTH / 2;
    if (p.x - BALL_RADIUS < -halfW) { p.x = -halfW + BALL_RADIUS; v.x *= -0.5; }
    if (p.x + BALL_RADIUS > halfW) { p.x = halfW - BALL_RADIUS; v.x *= -0.5; }

    this.shadow.position.x = p.x;
    this.shadow.position.z = p.z;
    const h = Math.max(0, p.y);
    this.shadow.material.opacity = 0.3 * Math.max(0.15, 1 - h / 6);
    const s = Math.max(0.4, 1 - h / 8);
    this.shadow.scale.set(s, s, s);
  }

  updateSpecial(dt, particles) {
    const s = this.special;
    const v = this.velocity;
    const p = this.mesh.position;
    s.timer -= dt;

    switch (s.type) {
      case 'shockwave':
        v.y += GRAVITY * s.gravityMul * dt;
        if (particles && Math.random() < 0.5) particles.spawn(p, 0xffd25c, 1, { speed: 0.5, life: 0.4, size: 0.18, gravity: 0 });
        break;
      case 'iron':
        v.y += GRAVITY * s.gravityMul * dt;
        if (particles && Math.random() < 0.6) particles.spawn(p, 0xdfe8ef, 1, { speed: 0.4, life: 0.25, size: 0.08, gravity: 0 });
        break;
      case 'taichi':
        s.phase += dt * 6;
        v.y += GRAVITY * s.gravityMul * dt;
        v.x += Math.sin(s.phase) * s.curveStrength * dt;
        if (particles) particles.spawn(p, Math.sin(s.phase) > 0 ? 0x111111 : 0xffffff, 1, { speed: 0.2, life: 0.4, size: 0.13, gravity: 0 });
        break;
      case 'fire':
        v.y += GRAVITY * s.gravityMul * dt;
        v.addScaledVector(s.dir, s.thrust * dt);
        if (particles) particles.spawn(p, Math.random() > 0.5 ? 0xff6a2b : 0xffd25c, 2, { speed: 1, life: 0.35, size: 0.16, gravity: 1 });
        break;
      case 'phantom':
        v.y += GRAVITY * s.gravityMul * dt;
        break;
      case 'wind':
        s.phase += dt * 8;
        v.y += GRAVITY * s.gravityMul * dt;
        v.x += Math.cos(s.phase) * s.curveStrength * dt;
        if (particles && Math.random() < 0.6) particles.spawn(p, 0x5ce0ff, 1, { speed: 0.3, life: 0.3, size: 0.12, gravity: 0 });
        break;
    }

    if (s.timer <= 0) this.special = null;
  }
}
