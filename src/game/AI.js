import * as THREE from 'three';
import { FIELD_WIDTH, GOAL_WIDTH } from './constants.js';
import { canKick, doNormalKick, doSpecialKick } from './Kicking.js';

const _v = new THREE.Vector3();
const _goal = new THREE.Vector3();
const _target = new THREE.Vector3();

function distXZ(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function updateTeamAI(team, ball, { controlledPlayer, particles }) {
  const outfield = team.players.filter((p) => p.role !== 'GK');
  let chaser;
  if (ball.intendedReceiver && outfield.includes(ball.intendedReceiver)) {
    // a teammate just passed to this player — they alone should run onto it,
    // everyone else holds shape instead of also converging on the ball.
    chaser = ball.intendedReceiver;
  } else {
    chaser = outfield[0];
    let bestDist = Infinity;
    for (const p of outfield) {
      const d = distXZ(p.position, ball.position);
      if (d < bestDist) { bestDist = d; chaser = p; }
    }
  }

  for (const player of team.players) {
    if (player === controlledPlayer) continue;

    if (player.role === 'GK') {
      goalkeeperAI(player, team, ball, particles);
      continue;
    }

    if (player === chaser) {
      chaserAI(player, team, ball, particles);
    } else {
      supportAI(player, team, ball);
    }
  }
}

function goalkeeperAI(player, team, ball, particles) {
  const goalZ = team.ownGoalZ();
  const halfW = GOAL_WIDTH / 2 - 0.4;
  const targetX = THREE.MathUtils.clamp(ball.position.x, -halfW, halfW);
  const targetZ = goalZ + team.attackDir * 1.6;
  _target.set(targetX, 0, targetZ);

  const nearBall = distXZ(player.position, ball.position) < 6;
  const toTarget = _v.set(_target.x - player.position.x, 0, _target.z - player.position.z);
  const dist = toTarget.length();
  player.desiredDir.copy(dist > 0.3 ? toTarget.normalize().multiplyScalar(Math.min(1, dist / 2)) : toTarget.set(0, 0, 0));
  player.faceToward(ball.position);

  if (canKick(player, ball) && nearBall) {
    _v.set((Math.random() - 0.5) * 0.6, 0, team.attackDir).normalize();
    doNormalKick(player, ball, _v, 15, 5.5, particles);
  }
}

export function pickPassTarget(player, team, ball) {
  let best = null;
  let bestScore = -Infinity;
  for (const mate of team.players) {
    if (mate === player || mate.role === 'GK') continue;
    const advance = (mate.position.z - player.position.z) * team.attackDir;
    const dist = distXZ(mate.position, player.position);
    if (dist > 24 || dist < 2) continue;
    const score = advance - dist * 0.3;
    if (score > bestScore) { bestScore = score; best = mate; }
  }
  return best;
}

function chaserAI(player, team, ball, particles) {
  const toBall = _v.set(ball.position.x - player.position.x, 0, ball.position.z - player.position.z);
  const dist = toBall.length();
  player.desiredDir.copy(dist > 0.2 ? toBall.clone().normalize() : new THREE.Vector3());
  player.faceToward(ball.position);

  if (!canKick(player, ball)) return;

  _goal.set(0, 0, team.opponentGoalZ());
  const distToGoal = distXZ(player.position, _goal);

  if (player.isHero && player.meter >= 100 && distToGoal < 26 && Math.random() < 0.5) {
    const dir = _goal.clone().sub(player.position);
    dir.x += (Math.random() - 0.5) * 3;
    dir.y = 0;
    dir.normalize();
    doSpecialKick(player, ball, dir, particles);
    return;
  }

  if (distToGoal < 20) {
    const aim = _goal.clone();
    aim.x += (Math.random() - 0.5) * GOAL_WIDTH * 0.7;
    const dir = aim.sub(player.position);
    dir.y = 0;
    dir.normalize();
    doNormalKick(player, ball, dir, 15.5 + Math.random() * 2, 4.5, particles);
    return;
  }

  const mate = pickPassTarget(player, team, ball);
  if (mate && Math.random() < 0.55) {
    const dir = new THREE.Vector3(mate.position.x - player.position.x, 0, mate.position.z - player.position.z).normalize();
    doNormalKick(player, ball, dir, 11.5, 2.2, particles);
    ball.intendedReceiver = mate;
    ball.receiverTimer = 3;
    return;
  }

  const dir = new THREE.Vector3(0, 0, team.attackDir);
  dir.x += (Math.random() - 0.5) * 0.4;
  dir.normalize();
  doNormalKick(player, ball, dir, 7, 1.4, particles);
}

function supportAI(player, team, ball) {
  // Keep a disciplined shape: drift toward the ball's side a little rather
  // than everyone collapsing onto it, and stay within a bounded distance of
  // this player's own formation slot so lines (defense/mid/attack) hold up.
  const shiftX = 0.22;
  const shiftZ = 0.16;
  const maxDrift = 7;
  const targetX = THREE.MathUtils.clamp(
    player.formationSlot.x + (ball.position.x - player.formationSlot.x) * shiftX,
    -FIELD_WIDTH / 2 + 1.5, FIELD_WIDTH / 2 - 1.5,
  );
  const zDrift = THREE.MathUtils.clamp((ball.position.z - player.formationSlot.y) * shiftZ, -maxDrift, maxDrift);
  const targetZ = player.formationSlot.y + zDrift;
  _target.set(targetX, 0, targetZ);

  const toTarget = _v.set(_target.x - player.position.x, 0, _target.z - player.position.z);
  const dist = toTarget.length();
  if (dist > 0.4) {
    player.desiredDir.copy(toTarget.normalize().multiplyScalar(Math.min(0.65, dist / 3)));
    player.faceToward(_target);
  } else {
    player.desiredDir.set(0, 0, 0);
  }
}
