import * as THREE from 'three';
import { Player } from './Player.js';
import { FIELD_LENGTH } from './constants.js';

// Diamond-ish 1-1-2-1 shape (index 0 is always the goalkeeper).
const BASE_SLOTS = [
  { x: 0, z: -FIELD_LENGTH / 2 + 2.2, role: 'GK' },
  { x: 0, z: -FIELD_LENGTH * 0.22, role: 'FIELD' },
  { x: -6.5, z: -FIELD_LENGTH * 0.05, role: 'FIELD' },
  { x: 6.5, z: -FIELD_LENGTH * 0.05, role: 'FIELD' },
  { x: 0, z: FIELD_LENGTH * 0.22, role: 'FIELD' },
];

export class Team {
  constructor(scene, { side, jerseyColor, heroChar, teamName }) {
    this.side = side; // 'A' | 'B'
    this.jerseyColor = jerseyColor;
    this.teamName = teamName;
    this.attackDir = side === 'A' ? 1 : -1;
    this.score = 0;

    this.players = BASE_SLOTS.map((slot, i) => {
      const isHero = i === 4; // the advanced forward slot is the star player
      const player = new Player(scene, {
        team: side,
        number: i + 1,
        isHero,
        char: isHero ? heroChar : null,
        jerseyColor,
        role: slot.role,
      });
      player.formationSlot.set(slot.x, slot.z * this.attackDir);
      return player;
    });

    this.hero = this.players[4];
    this.goalkeeper = this.players[0];
    this.resetPositions();
  }

  resetPositions() {
    for (const p of this.players) {
      p.position.set(p.formationSlot.x, 0, p.formationSlot.y);
      p.velocity.set(0, 0, 0);
      p.facing = this.attackDir > 0 ? 0 : Math.PI;
    }
  }

  ownGoalZ() { return -this.attackDir * FIELD_LENGTH / 2; }
  opponentGoalZ() { return this.attackDir * FIELD_LENGTH / 2; }
}
