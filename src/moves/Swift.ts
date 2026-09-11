// ============================================================
// src/moves/Swift.ts — Homing star projectiles
// ============================================================
import Phaser from 'phaser';
import { MoveBase } from './MoveBase';
import { MOVES } from '../data/moves';
import { Player } from '../entities/Player';
import { EnemyState } from '../entities/Enemy';

interface StarProj {
  obj: Phaser.GameObjects.Star;
  vx: number;
  vy: number;
  targetId: number;
  dmg: number;
  life: number;
  maxLife: number;
}

export class Swift extends MoveBase {
  private stars: StarProj[] = [];

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, MOVES.swift, player);
  }

  protected fire(enemies: EnemyState[]): void {
    const count = this.data.projectileCount ?? 3;
    for (let i = 0; i < count; i++) {
      const target = this.findRandomAliveEnemy(enemies);
      let vx = 0, vy = -1;
      let targetId = -1;

      if (target) {
        const dx = target.x - this.player.x;
        const dy = target.y - this.player.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        vx = dx / dist;
        vy = dy / dist;
        targetId = target.id;
      } else {
        const angle = (i / count) * Math.PI * 2;
        vx = Math.cos(angle);
        vy = Math.sin(angle);
      }

      const speed = 220;
      const star = this.scene.add.star(this.player.x, this.player.y, 5, 4, 10, 0xffff40, 1);
      star.setDepth(9);
      star.setStrokeStyle(1, 0xffcc00, 1);

      this.stars.push({
        obj: star,
        vx: vx * speed,
        vy: vy * speed,
        targetId,
        dmg: this.calcDamage(),
        life: 0,
        maxLife: 2500,
      });
    }
  }

  update(delta: number, enemies: EnemyState[]): void {
    super.update(delta, enemies);

    const dt = delta / 1000;
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      s.life += delta;

      if (!s.obj.active || s.life > s.maxLife) {
        s.obj.destroy();
        this.stars.splice(i, 1);
        continue;
      }

      // Homing: adjust velocity toward target if alive
      const target = enemies.find(e => e.id === s.targetId && e.alive);
      if (target) {
        const dx = target.x - s.obj.x;
        const dy = target.y - s.obj.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const nx = dx / dist;
        const ny = dy / dist;
        const speed = 220;
        const homingStrength = 0.08;
        s.vx = s.vx * (1 - homingStrength) + nx * speed * homingStrength;
        s.vy = s.vy * (1 - homingStrength) + ny * speed * homingStrength;
      }

      s.obj.x += s.vx * dt;
      s.obj.y += s.vy * dt;
      s.obj.angle += 6;

      // Collision
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - s.obj.x;
        const dy = e.y - s.obj.y;
        if (dx*dx + dy*dy < (e.def.hitboxSize + 10) * (e.def.hitboxSize + 10)) {
          e.hp -= s.dmg;
          if (e.hp <= 0) e.alive = false;
          s.obj.destroy();
          this.stars.splice(i, 1);
          break;
        }
      }
    }
  }

  destroy(): void {
    for (const s of this.stars) s.obj.destroy();
  }
}
