import * as THREE from 'three';

const POOL_SIZE = 260;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    const geo = new THREE.SphereGeometry(1, 6, 6);
    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.userData = { life: 0, maxLife: 1, vel: new THREE.Vector3(), gravity: 0, size: 1 };
      scene.add(mesh);
      this.pool.push(mesh);
    }
    this.cursor = 0;
  }

  spawn(pos, color, count, opts = {}) {
    const speed = opts.speed ?? 3;
    const life = opts.life ?? 0.5;
    const size = opts.size ?? 0.12;
    const gravity = opts.gravity ?? -6;
    const spread = opts.spread ?? 1;
    for (let i = 0; i < count; i++) {
      const m = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % POOL_SIZE;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * spread;
      const s = speed * (0.4 + Math.random() * 1.1);
      m.userData.vel.set(
        Math.sin(phi) * Math.cos(theta) * s,
        Math.cos(phi) * s * (opts.up ?? 1),
        Math.sin(phi) * Math.sin(theta) * s,
      );
      m.userData.life = life;
      m.userData.maxLife = life;
      m.userData.gravity = gravity;
      m.userData.size = size * (0.6 + Math.random() * 0.8);
      m.position.copy(pos);
      m.scale.setScalar(m.userData.size);
      m.material.color.set(color);
      m.material.opacity = 1;
      m.visible = true;
    }
  }

  update(dt) {
    for (const m of this.pool) {
      if (!m.visible) continue;
      const d = m.userData;
      d.life -= dt;
      if (d.life <= 0) { m.visible = false; continue; }
      d.vel.y += d.gravity * dt;
      m.position.addScaledVector(d.vel, dt);
      const a = Math.max(0, d.life / d.maxLife);
      m.material.opacity = a;
      m.scale.setScalar(d.size * (0.5 + a * 0.5));
    }
  }
}
