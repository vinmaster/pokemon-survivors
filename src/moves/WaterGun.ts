// ============================================================
// src/moves/WaterGun.ts — Knockback projectile
// ============================================================
import Phaser from 'phaser';
import { MoveBase } from './MoveBase';
import { MOVES } from '../data/moves';
import { Player } from '../entities/Player';
import { EnemyState } from '../entities/Enemy';

export class WaterGun extends MoveBase {
  private projectiles: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, MOVES.waterGun, player);
  }

  protected fire(enemies: EnemyState[]): void {
    const target = this.findClosestEnemy(enemies);
    if (!target) return;

    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    const speed = 320;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    // Create a water blob (larger, blue)
    const proj = this.scene.add.arc(this.player.x, this.player.y, 8, 0, 360, false, 0x40a0ff, 0.9);
    proj.setDepth(9);
    this.projectiles.push(proj);
    proj.setData('vx', vx);
    proj.setData('vy', vy);
    proj.setData('dmg', this.calcDamage());
    proj.setData('life', 0);
    proj.setData('maxLife', (this.data.range! / speed) * 1000 + 200);
    proj.setData('kb', this.data.knockback ?? 0);
    proj.setData('nx', dx / dist);
    proj.setData('ny', dy / dist);
  }

  update(delta: number, enemies: EnemyState[]): void {
    super.update(delta, enemies);

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

      const dmg = proj.getData('dmg') as number;
      const kb = proj.getData('kb') as number;
      const nx = proj.getData('nx') as number;
      const ny = proj.getData('ny') as number;

      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - proj.x;
        const dy = e.y - proj.y;
        if (dx*dx + dy*dy < (e.def.hitboxSize + 8) * (e.def.hitboxSize + 8)) {
          e.hp -= dmg;
          // Apply knockback
          e.knockbackX = nx * kb;
          e.knockbackY = ny * kb;
          e.knockbackTime = 200;
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
