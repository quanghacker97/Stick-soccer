import * as THREE from 'three';

// dir is a normalized THREE.Vector3 on the XZ plane pointing where the shot travels.
export function applySpecialKick(ball, dir, type, particles, trailColor) {
  ball.groundHits = 0;
  particles.spawn(ball.position, trailColor, 30, { speed: 4, life: 0.5, size: 0.16, up: 1.4 });

  const v = ball.velocity;
  switch (type) {
    case 'shockwave':
      v.copy(dir).multiplyScalar(17);
      v.y = 6;
      ball.special = { type, timer: 1.1, gravityMul: 0.5 };
      break;
    case 'iron':
      v.copy(dir).multiplyScalar(19);
      v.y = 2.2;
      ball.special = { type, timer: 1.15, gravityMul: 0.2 };
      break;
    case 'taichi':
      v.copy(dir).multiplyScalar(13.5);
      v.y = 7.5;
      ball.special = { type, timer: 1.3, gravityMul: 0.7, phase: 0, curveStrength: 9 };
      break;
    case 'fire':
      v.copy(dir).multiplyScalar(11.5);
      v.y = 8.5;
      ball.special = { type, timer: 1.1, gravityMul: 0.9, dir: dir.clone(), thrust: 7 };
      break;
    case 'phantom': {
      const blinkDist = 12;
      particles.spawn(ball.position, trailColor, 20, { speed: 1, life: 0.35, size: 0.2, gravity: 0 });
      ball.position.addScaledVector(dir, blinkDist);
      particles.spawn(ball.position, trailColor, 20, { speed: 1, life: 0.35, size: 0.2, gravity: 0 });
      v.copy(dir).multiplyScalar(15);
      v.y = 5;
      ball.special = { type, timer: 0.7, gravityMul: 0.55 };
      break;
    }
    case 'wind':
      v.copy(dir).multiplyScalar(15.5);
      v.y = 6.5;
      ball.special = { type, timer: 1.2, gravityMul: 0.55, phase: 0, curveStrength: 6 };
      break;
    default:
      v.copy(dir).multiplyScalar(15);
      v.y = 6;
  }
}

export function applyNormalKick(ball, dir, power, lift) {
  ball.special = null;
  ball.velocity.copy(dir).multiplyScalar(power);
  ball.velocity.y = lift;
}
