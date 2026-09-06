import * as THREE from 'three';

const RUN_ACCEL = 26;
const RUN_MAX_SPEED = 6.4;
const RUN_FRICTION = 14;

function buildBody(jerseyColor, skinColor, headbandColor) {
  const group = new THREE.Group();

  const jerseyMat = new THREE.MeshStandardMaterial({ color: jerseyColor, roughness: 0.7 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 4, 8), jerseyMat);
  torso.position.y = 1.05;
  group.add(torso);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.26), shortsMat);
  hips.position.y = 0.75;
  group.add(hips);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), skinMat);
  head.position.y = 1.62;
  group.add(head);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.04, 6, 12), new THREE.MeshStandardMaterial({ color: headbandColor }));
  band.position.y = 1.64;
  band.rotation.x = Math.PI / 2;
  group.add(band);

  function limb(length, radius, color) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.65 }));
    mesh.position.y = -length / 2 - radius;
    pivot.add(mesh);
    return pivot;
  }

  const armL = limb(0.5, 0.09, skinColor);
  armL.position.set(-0.32, 1.32, 0);
  const armR = limb(0.5, 0.09, skinColor);
  armR.position.set(0.32, 1.32, 0);
  group.add(armL, armR);

  const legL = limb(0.62, 0.12, 0x222222);
  legL.position.set(-0.14, 0.64, 0);
  const legR = limb(0.62, 0.12, 0x222222);
  legR.position.set(0.14, 0.64, 0);
  group.add(legL, legR);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 12, 10),
    new THREE.MeshBasicMaterial({ color: headbandColor, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }),
  );
  glow.position.y = 1.0;
  group.add(glow);

  return { group, armL, armR, legL, legR, glow, torso };
}

let idCounter = 0;

export class Player {
  constructor(scene, { team, number, isHero = false, char = null, jerseyColor, role = 'FIELD' }) {
    this.id = idCounter++;
    this.team = team;
    this.number = number;
    this.isHero = isHero;
    this.char = char;
    this.role = role; // 'GK' | 'FIELD'
    this.attackDir = team === 'A' ? 1 : -1; // +1 attacks +Z, -1 attacks -Z

    const skinColor = 0xe8b98a;
    const bandColor = isHero && char ? char.color : jerseyColor;
    const parts = buildBody(jerseyColor, skinColor, bandColor);
    this.parts = parts;
    this.mesh = parts.group;
    scene.add(this.mesh);

    this.position = this.mesh.position;
    this.velocity = new THREE.Vector3();
    this.desiredDir = new THREE.Vector3();
    this.facing = team === 'A' ? 0 : Math.PI;

    this.walkPhase = Math.random() * 10;
    this.kickAnim = 0;
    this.skillAnim = 0;
    this.kickCooldown = 0;
    this.meter = 0;
    this.formationSlot = new THREE.Vector2();
  }

  get speed() { return Math.hypot(this.velocity.x, this.velocity.z); }

  faceToward(target) {
    const dx = target.x - this.position.x;
    const dz = target.z - this.position.z;
    if (dx * dx + dz * dz > 0.0004) this.facing = Math.atan2(dx, dz);
  }

  forwardVector(out = new THREE.Vector3()) {
    return out.set(Math.sin(this.facing), 0, Math.cos(this.facing));
  }

  update(dt) {
    const dir = this.desiredDir;
    const dLen = dir.length();
    if (dLen > 0.01) {
      const nx = dir.x / dLen, nz = dir.z / dLen;
      this.velocity.x += nx * RUN_ACCEL * dt;
      this.velocity.z += nz * RUN_ACCEL * dt;
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      const cap = RUN_MAX_SPEED * Math.min(1, dLen);
      if (speed > cap) {
        const s = cap / speed;
        this.velocity.x *= s; this.velocity.z *= s;
      }
      if (this.kickAnim <= 0) this.faceToward({ x: this.position.x + nx, z: this.position.z + nz });
    } else {
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      const drop = Math.min(speed, RUN_FRICTION * dt);
      if (speed > 0) {
        const scale = (speed - drop) / speed;
        this.velocity.x *= scale; this.velocity.z *= scale;
      }
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.mesh.rotation.y = this.facing;

    if (this.kickCooldown > 0) this.kickCooldown -= dt;
    if (this.kickAnim > 0) this.kickAnim -= dt;
    if (this.skillAnim > 0) this.skillAnim -= dt;

    this.animate(dt);
  }

  animate(dt) {
    const speed = this.speed;
    if (this.kickAnim > 0) {
      const t = 1 - Math.max(0, this.kickAnim / 0.32);
      this.parts.legR.rotation.x = -1.1 + t * 2.3;
      this.parts.legL.rotation.x = 0.15;
      this.parts.armL.rotation.x = -0.6;
      this.parts.armR.rotation.x = 0.4;
    } else if (speed > 0.15) {
      this.walkPhase += dt * (4 + speed);
      const swing = Math.sin(this.walkPhase) * Math.min(1, speed / RUN_MAX_SPEED);
      this.parts.legL.rotation.x = swing * 0.9;
      this.parts.legR.rotation.x = -swing * 0.9;
      this.parts.armL.rotation.x = -swing * 0.6;
      this.parts.armR.rotation.x = swing * 0.6;
    } else {
      this.parts.legL.rotation.x *= 0.8;
      this.parts.legR.rotation.x *= 0.8;
      this.parts.armL.rotation.x *= 0.8;
      this.parts.armR.rotation.x *= 0.8;
    }

    if (this.skillAnim > 0) {
      const a = Math.min(1, this.skillAnim / 0.5);
      this.parts.glow.material.opacity = a * 0.55;
      this.parts.glow.scale.setScalar(1 + (1 - a) * 0.6);
    } else if (this.parts.glow.material.opacity > 0) {
      this.parts.glow.material.opacity = 0;
    }
  }
}
