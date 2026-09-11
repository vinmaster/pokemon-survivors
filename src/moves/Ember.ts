// ============================================================
// src/moves/Ember.ts — Auto-fire projectile toward nearest enemy
// ============================================================
import Phaser from 'phaser';
import { MoveBase } from './MoveBase';
import { MOVES } from '../data/moves';
import { Player } from '../entities/Player';
import { EnemyState } from '../entities/Enemy';

export class Ember extends MoveBase {
  private projectiles: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, MOVES.ember, player);
  }

  protected fire(enemies: EnemyState[]): void {
    const target = this.findClosestEnemy(enemies);
    if (!target) return;

    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > this.data.range!) return;

    const speed = 280;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    const proj = this.scene.add.arc(this.player.x, this.player.y, 6, 0, 360, false, 0xff6820, 1);
    proj.setDepth(9);
    this.projectiles.push(proj);

    // Store velocity on the arc using data
    proj.setData('vx', vx);
    proj.setData('vy', vy);
    proj.setData('dmg', this.calcDamage());
    proj.setData('life', 0);
    proj.setData('maxLife', (this.data.range! / speed) * 1000 + 200);
    proj.setData('targetId', target.id);
  }

  update(delta: number, enemies: EnemyState[]): void {
    super.update(delta, enemies);

    // Advance active projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.active) { this.projectiles.splice(i, 1); continue; }

      const life = proj.getData('life') + delta;
      proj.setData('life', life);

      if (life > proj.getData('maxLife')) {
        proj.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      const dt = delta / 1000;
      proj.x += proj.getData('vx') * dt;
      proj.y += proj.getData('vy') * dt;

      // Check collision
      const dmg = proj.getData('dmg') as number;
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - proj.x;
        const dy = e.y - proj.y;
        if (dx*dx + dy*dy < (e.def.hitboxSize + 6) * (e.def.hitboxSize + 6)) {
          e.hp -= dmg;
          if (e.hp <= 0) e.alive = false;
          proj.destroy();
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }

  destroy(): void {
    for (const p of this.projectiles) p.destroy();
  }
}
