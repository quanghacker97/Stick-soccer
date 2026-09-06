import * as THREE from 'three';
import { FIELD_WIDTH } from './constants.js';

const _desired = new THREE.Vector3();
const _focus = new THREE.Vector3();

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.smoothPos = new THREE.Vector3(0, 16, -19);
    this.smoothLook = new THREE.Vector3(0, 0, 0);
    camera.position.copy(this.smoothPos);
  }

  update(dt, ball, controlledPlayer) {
    const attackDir = controlledPlayer ? controlledPlayer.attackDir : 1;

    // Anchor mostly on the ball (like DLS/FIFA-style broadcast cameras) with
    // just a light pull toward the controlled player, so the whole team's
    // shape and open space stays visible instead of hugging one player.
    const focusX = controlledPlayer ? THREE.MathUtils.lerp(ball.position.x, controlledPlayer.position.x, 0.22) : ball.position.x;
    const focusZ = controlledPlayer ? THREE.MathUtils.lerp(ball.position.z, controlledPlayer.position.z, 0.22) : ball.position.z;
    const followX = THREE.MathUtils.clamp(focusX, -FIELD_WIDTH / 2, FIELD_WIDTH / 2);

    // Only pull back further for genuinely long balls (corners, clearances)
    // — normal play keeps a steady, wide framing rather than zooming a lot.
    const sepDist = controlledPlayer ? Math.hypot(ball.position.x - controlledPlayer.position.x, ball.position.z - controlledPlayer.position.z) : 0;
    const zoomOut = THREE.MathUtils.clamp((sepDist - 20) / 25, 0, 1);
    const distBehind = THREE.MathUtils.lerp(19, 26, zoomOut);
    const height = THREE.MathUtils.lerp(16, 21, zoomOut) + Math.min(3, Math.abs(ball.velocity.y) * 0.2);

    _desired.set(followX, height, focusZ - attackDir * distBehind);
    const damp = 1 - Math.pow(0.002, dt);
    this.smoothPos.lerp(_desired, damp);
    this.camera.position.copy(this.smoothPos);

    _focus.set(followX * 0.65, 0.6, focusZ + attackDir * 9);
    this.smoothLook.lerp(_focus, damp);
    this.camera.lookAt(this.smoothLook);
  }
}
