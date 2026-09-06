import * as THREE from 'three';
import { FIELD_WIDTH } from './constants.js';

const _desired = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _focus = new THREE.Vector3();

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.smoothPos = new THREE.Vector3(0, 10, -14);
    this.smoothLook = new THREE.Vector3(0, 0, 0);
    camera.position.copy(this.smoothPos);
  }

  update(dt, ball, controlledPlayer) {
    const player = controlledPlayer;
    const attackDir = player ? player.attackDir : 1;

    const focusX = player ? THREE.MathUtils.lerp(player.position.x, ball.position.x, 0.35) : ball.position.x;
    const focusZ = player ? THREE.MathUtils.lerp(player.position.z, ball.position.z, 0.35) : ball.position.z;
    const followX = THREE.MathUtils.clamp(focusX, -FIELD_WIDTH / 2, FIELD_WIDTH / 2);

    // Pull the camera back a little when the ball is far from the controlled
    // player (a long pass, a loose ball) so both stay in frame; stay tight
    // and close for normal dribbling so the action actually reads as soccer.
    const sepDist = player ? Math.hypot(ball.position.x - player.position.x, ball.position.z - player.position.z) : 0;
    const zoomOut = THREE.MathUtils.clamp((sepDist - 7) / 22, 0, 1);
    const distBehind = THREE.MathUtils.lerp(11, 20, zoomOut);
    const height = THREE.MathUtils.lerp(7.5, 14, zoomOut) + Math.min(4, Math.abs(ball.velocity.y) * 0.3);

    _desired.set(followX, height, focusZ - attackDir * distBehind);
    const damp = 1 - Math.pow(0.0008, dt);
    this.smoothPos.lerp(_desired, damp);
    this.camera.position.copy(this.smoothPos);

    _focus.set(followX * 0.6, 0.6, focusZ + attackDir * THREE.MathUtils.lerp(4, 8, zoomOut));
    this.smoothLook.lerp(_focus, damp);
    this.camera.lookAt(this.smoothLook);
  }
}
