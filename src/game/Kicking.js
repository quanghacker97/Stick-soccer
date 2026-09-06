import * as THREE from 'three';
import { PLAYER_KICK_RANGE } from './constants.js';
import { applyNormalKick, applySpecialKick } from './Skills.js';

const _diff = new THREE.Vector3();

export function canKick(player, ball) {
  _diff.copy(ball.position).sub(player.position);
  _diff.y *= 0.6; // a little forgiving on height so lofted balls are still playable
  return _diff.length() < PLAYER_KICK_RANGE && player.kickCooldown <= 0;
}

export function doNormalKick(player, ball, dir, power, lift, particles) {
  ball.lastTouch = { player, team: player.team };
  ball.intendedReceiver = null;
  ball.kickLock = 0.15;
  applyNormalKick(ball, dir, power, lift);
  player.kickAnim = 0.32;
  player.kickCooldown = 0.4;
  if (player.isHero) player.meter = Math.min(100, player.meter + 14);
  particles.spawn(ball.position, 0xffffff, 8, { speed: 2, life: 0.3, size: 0.08 });
}

export function doSpecialKick(player, ball, dir, particles) {
  ball.lastTouch = { player, team: player.team };
  ball.intendedReceiver = null;
  ball.kickLock = 0.15;
  applySpecialKick(ball, dir, player.char.special, particles, player.char.trail);
  player.kickAnim = 0.32;
  player.kickCooldown = 0.5;
  player.skillAnim = 0.5;
  player.meter = 0;
}
