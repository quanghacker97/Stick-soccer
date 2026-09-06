import * as THREE from 'three';
import { createField } from './Field.js';
import { Ball } from './Ball.js';
import { Team } from './Team.js';
import { ParticleSystem } from './Particles.js';
import { CameraRig } from './CameraRig.js';
import { InputManager } from './Input.js';
import { updateTeamAI, pickPassTarget } from './AI.js';
import { canKick, doNormalKick, doSpecialKick } from './Kicking.js';
import { CHARACTERS } from './characters.js';
import {
  FIELD_LENGTH, GOAL_WIDTH, GOAL_HEIGHT, BALL_RADIUS,
  PLAYER_RADIUS, MATCH_SECONDS,
} from './constants.js';

const _diff = new THREE.Vector3();
const _dir = new THREE.Vector3();

export class Game {
  constructor({ scene, camera }) {
    this.scene = scene;
    this.camera = camera;
    this.input = new InputManager();
    this.cameraRig = new CameraRig(camera);
    this.particles = new ParticleSystem(scene);

    this.state = 'menu';
    this.heroChar = CHARACTERS[0];
    this.controlIndex = 4; // hero slot by default

    createField(scene);
    this.ball = new Ball(scene);

    this.wireMenu();
  }

  wireMenu() {
    const grid = document.getElementById('char-grid');
    for (const char of CHARACTERS) {
      const card = document.createElement('div');
      card.className = 'char-card';
      card.dataset.id = char.id;
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.background = `#${char.color.toString(16).padStart(6, '0')}22`;
      const headDot = document.createElement('div');
      headDot.className = 'head';
      headDot.style.background = `#${char.color.toString(16).padStart(6, '0')}`;
      swatch.appendChild(headDot);
      const name = document.createElement('div'); name.className = 'name'; name.textContent = char.name;
      const skill = document.createElement('div'); skill.className = 'skill'; skill.textContent = char.skillName;
      const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = char.desc;
      card.append(swatch, name, skill, desc);
      grid.appendChild(card);
    }

    let pending = null;
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.char-card');
      if (!card) return;
      grid.querySelectorAll('.char-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      pending = CHARACTERS.find((c) => c.id === card.dataset.id);
      document.getElementById('btn-confirm-select').disabled = false;
    });

    document.getElementById('btn-to-select').addEventListener('click', () => {
      document.getElementById('overlay-menu').classList.add('hidden');
      document.getElementById('overlay-select').classList.remove('hidden');
    });

    document.getElementById('btn-confirm-select').addEventListener('click', () => {
      if (!pending) return;
      this.heroChar = pending;
      document.getElementById('overlay-select').classList.add('hidden');
      this.startMatch();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      document.getElementById('overlay-gameover').classList.add('hidden');
      document.getElementById('overlay-menu').classList.remove('hidden');
      this.state = 'menu';
    });
  }

  startMatch() {
    if (this.teamA) this.teardownTeams();

    const rivalPool = CHARACTERS.filter((c) => c.id !== this.heroChar.id);
    const rivalChar = rivalPool[Math.floor(Math.random() * rivalPool.length)];

    this.teamA = new Team(this.scene, { side: 'A', jerseyColor: 0xd8452f, heroChar: this.heroChar, teamName: this.heroChar.name.split(' ').slice(-1)[0] + ' FC' });
    this.teamB = new Team(this.scene, { side: 'B', jerseyColor: 0x2f6fd8, heroChar: rivalChar, teamName: 'Hắc Long FC' });

    document.getElementById('team-a-name').textContent = this.teamA.teamName;
    document.getElementById('team-b-name').textContent = this.teamB.teamName;

    this.controlIndex = 4;
    this.controlled = this.teamA.players[this.controlIndex];
    this.matchTime = MATCH_SECONDS;
    this.goalFreeze = 0;

    this.ball.reset(new THREE.Vector3(0, BALL_RADIUS + 3, 0));

    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('overlay-gameover').classList.add('hidden');
    document.getElementById('team-a-score').textContent = '0';
    document.getElementById('team-b-score').textContent = '0';
    this.state = 'playing';
  }

  teardownTeams() {
    for (const team of [this.teamA, this.teamB]) {
      for (const p of team.players) this.scene.remove(p.mesh);
    }
  }

  cycleControl() {
    this.controlIndex = (this.controlIndex + 1) % this.teamA.players.length;
    this.controlled = this.teamA.players[this.controlIndex];
  }

  autoSwitchControl() {
    const cur = this.controlled;
    const curDist = _diff.copy(this.ball.position).sub(cur.position).setY(0).length();
    if (curDist < 8) return;
    let best = cur, bestDist = curDist;
    this.teamA.players.forEach((p, idx) => {
      if (p.role === 'GK') return;
      const d = _diff.copy(this.ball.position).sub(p.position).setY(0).length();
      if (d < bestDist - 4) { bestDist = d; best = p; this.controlIndex = idx; }
    });
    this.controlled = best;
  }

  handleControlledInput() {
    const p = this.controlled;
    const input = this.input;
    const move = input.getMoveVector();
    p.desiredDir.set(move.x, 0, move.z);

    if (input.wasPressed('tab')) this.cycleControl();

    if (!canKick(p, this.ball)) return;
    const facing = p.forwardVector(_dir);

    if (input.wasPressed('f') && p.isHero && p.meter >= 100) {
      doSpecialKick(p, this.ball, facing, this.particles);
    } else if (input.wasPressed('shift')) {
      const mate = pickPassTarget(p, this.teamA, this.ball);
      if (mate) {
        const dir = new THREE.Vector3(mate.position.x - p.position.x, 0, mate.position.z - p.position.z).normalize();
        doNormalKick(p, this.ball, dir, 11.5, 2.2, this.particles);
        this.ball.intendedReceiver = mate;
        this.ball.receiverTimer = 3;
      } else {
        doNormalKick(p, this.ball, facing, 9, 1.6, this.particles);
      }
    } else if (input.wasPressed(' ')) {
      doNormalKick(p, this.ball, facing, 16, 4.2, this.particles);
    }
  }

  resolveBallPlayerCollisions(owner) {
    const all = [...this.teamA.players, ...this.teamB.players];
    for (const p of all) {
      if (p === owner) continue;
      _diff.copy(this.ball.position).sub(p.position);
      const flatDist = Math.hypot(_diff.x, _diff.z);
      const minDist = PLAYER_RADIUS + BALL_RADIUS + 0.15;
      if (flatDist < minDist && flatDist > 0.001 && this.ball.position.y < 2.2) {
        const nx = _diff.x / flatDist, nz = _diff.z / flatDist;
        const overlap = minDist - flatDist;
        this.ball.position.x += nx * overlap;
        this.ball.position.z += nz * overlap;
        const rel = this.ball.velocity.x * nx + this.ball.velocity.z * nz;
        if (rel < 0) {
          this.ball.velocity.x -= 1.7 * rel * nx;
          this.ball.velocity.z -= 1.7 * rel * nz;
        }
      }
    }
  }

  // The player considered to be "carrying" the ball right now — a loose,
  // slow-moving ball near someone's feet, as opposed to a shot/pass in flight.
  findBallOwner() {
    if (this.ball.kickLock > 0) return null;
    const speed = Math.hypot(this.ball.velocity.x, this.ball.velocity.z);
    if (speed > 7 || this.ball.position.y > 1.2) return null;
    let owner = null, bestDist = 0.95;
    for (const p of [...this.teamA.players, ...this.teamB.players]) {
      const d = Math.hypot(this.ball.position.x - p.position.x, this.ball.position.z - p.position.z);
      if (d < bestDist) { bestDist = d; owner = p; }
    }
    return owner;
  }

  applyDribbleControl(owner, dt) {
    const fwd = owner.forwardVector(_dir);
    const aheadDist = 0.55 + Math.min(0.35, owner.speed * 0.05);
    const desiredX = owner.position.x + fwd.x * aheadDist;
    const desiredZ = owner.position.z + fwd.z * aheadDist;
    const pull = Math.min(1, dt * 9);
    this.ball.position.x += (desiredX - this.ball.position.x) * pull;
    this.ball.position.z += (desiredZ - this.ball.position.z) * pull;
    this.ball.velocity.x += (owner.velocity.x - this.ball.velocity.x) * pull;
    this.ball.velocity.z += (owner.velocity.z - this.ball.velocity.z) * pull;
    if (this.ball.position.y > BALL_RADIUS + 0.05) this.ball.velocity.y -= 9 * dt;
  }

  resolvePlayerPlayerCollisions() {
    const all = [...this.teamA.players, ...this.teamB.players];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        const dx = b.position.x - a.position.x, dz = b.position.z - a.position.z;
        const dist = Math.hypot(dx, dz);
        const minDist = PLAYER_RADIUS * 1.7;
        if (dist < minDist && dist > 0.001) {
          const push = (minDist - dist) / 2;
          const nx = dx / dist, nz = dz / dist;
          a.position.x -= nx * push; a.position.z -= nz * push;
          b.position.x += nx * push; b.position.z += nz * push;
        }
      }
    }
  }

  checkGoals() {
    if (this.goalFreeze > 0) return;
    const z = this.ball.position.z;
    const withinGoalMouth = Math.abs(this.ball.position.x) < GOAL_WIDTH / 2 && this.ball.position.y < GOAL_HEIGHT;

    if (z > FIELD_LENGTH / 2 + BALL_RADIUS) {
      if (withinGoalMouth) this.scoreGoal(this.teamA.attackDir === 1 ? this.teamA : this.teamB);
      else this.clampOutOfBounds(FIELD_LENGTH / 2);
    } else if (z < -FIELD_LENGTH / 2 - BALL_RADIUS) {
      if (withinGoalMouth) this.scoreGoal(this.teamA.attackDir === -1 ? this.teamA : this.teamB);
      else this.clampOutOfBounds(-FIELD_LENGTH / 2);
    }
  }

  clampOutOfBounds(edgeZ) {
    this.ball.position.z = edgeZ - Math.sign(edgeZ) * (BALL_RADIUS + 0.5);
    this.ball.velocity.set(0, 0, 0);
  }

  scoreGoal(team) {
    team.score++;
    document.getElementById(team === this.teamA ? 'team-a-score' : 'team-b-score').textContent = team.score;
    const banner = document.getElementById('goal-banner');
    banner.classList.remove('hidden');
    banner.style.animation = 'none';
    void banner.offsetWidth;
    banner.style.animation = '';
    this.particles.spawn(this.ball.position, 0xffd25c, 50, { speed: 6, life: 0.8, size: 0.2, up: 1.8 });
    this.goalFreeze = 2.2;
    setTimeout(() => banner.classList.add('hidden'), 1100);
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.particles.update(dt);

    if (this.goalFreeze > 0) {
      this.goalFreeze -= dt;
      if (this.goalFreeze <= 0) {
        this.teamA.resetPositions();
        this.teamB.resetPositions();
        this.ball.reset(new THREE.Vector3(0, BALL_RADIUS + 3, 0));
      }
      this.input.endFrame();
      this.cameraRig.update(dt, this.ball, this.controlled);
      return;
    }

    this.autoSwitchControl();
    this.handleControlledInput();
    updateTeamAI(this.teamA, this.ball, { controlledPlayer: this.controlled, particles: this.particles });
    updateTeamAI(this.teamB, this.ball, { controlledPlayer: null, particles: this.particles });

    for (const p of [...this.teamA.players, ...this.teamB.players]) p.update(dt);
    this.resolvePlayerPlayerCollisions();

    this.ball.update(dt, this.particles);
    const owner = this.findBallOwner();
    this.resolveBallPlayerCollisions(owner);
    if (owner) this.applyDribbleControl(owner, dt);
    this.checkGoals();

    this.matchTime -= dt;
    if (this.matchTime <= 0) { this.matchTime = 0; this.endMatch(); }

    this.updateHud();
    this.cameraRig.update(dt, this.ball, this.controlled);
    this.input.endFrame();
  }

  updateHud() {
    const mm = String(Math.floor(this.matchTime / 60)).padStart(2, '0');
    const ss = String(Math.floor(this.matchTime % 60)).padStart(2, '0');
    document.getElementById('timer').textContent = `${mm}:${ss}`;
    document.getElementById('meter1-fill').style.width = `${this.teamA.hero.meter}%`;
  }

  endMatch() {
    this.state = 'gameover';
    document.getElementById('hud').classList.add('hidden');
    const title = document.getElementById('gameover-title');
    const sub = document.getElementById('gameover-sub');
    if (this.teamA.score > this.teamB.score) title.textContent = `${this.teamA.teamName} CHIẾN THẮNG!`;
    else if (this.teamB.score > this.teamA.score) title.textContent = `${this.teamB.teamName} CHIẾN THẮNG!`;
    else title.textContent = 'HÒA!';
    sub.textContent = `Tỷ số: ${this.teamA.score} - ${this.teamB.score}`;
    document.getElementById('overlay-gameover').classList.remove('hidden');
  }
}
