import * as THREE from 'three';
import { FIELD_WIDTH } from './constants.js';

const _desired = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.smoothPos = new THREE.Vector3(0, 20, -24);
    this.smoothLook = new THREE.Vector3(0, 0, 0);
    camera.position.copy(this.smoothPos);
  }

  update(dt, ball, controlledPlayer) {
    const followX = THREE.MathUtils.clamp(ball.position.x * 0.55 + (controlledPlayer ? controlledPlayer.position.x * 0.15 : 0), -FIELD_WIDTH / 2, FIELD_WIDTH / 2);
    const behindSign = controlledPlayer && controlledPlayer.team === 'B' ? -1 : 1;
    const height = 19 + Math.min(6, Math.abs(ball.velocity.y) * 0.4);
    _desired.set(followX, height, ball.position.z - behindSign * 25);
    const damp = 1 - Math.pow(0.001, dt);
    this.smoothPos.lerp(_desired, damp);
    this.camera.position.copy(this.smoothPos);

    _lookAt.set(followX * 0.7, 0.5, ball.position.z + behindSign * 8);
    this.smoothLook.lerp(_lookAt, damp);
    this.camera.lookAt(this.smoothLook);
  }
}
