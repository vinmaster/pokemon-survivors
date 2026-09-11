// ============================================================
// src/moves/HydroPump.ts — High-knockback stream
// ============================================================
import Phaser from 'phaser';
import { MoveBase } from './MoveBase';
import { MOVES } from '../data/moves';
import { Player } from '../entities/Player';
import { EnemyState } from '../entities/Enemy';

export class HydroPump extends MoveBase {
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, MOVES.hydroPump, player);
    this.graphics = scene.add.graphics().setDepth(8);
  }

  protected fire(enemies: EnemyState[]): void {
    const target = this.findClosestEnemy(enemies);
    if (!target) return;

    const px = this.player.x, py = this.player.y;
    const dx = target.x - px;
    const dy = target.y - py;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const nx = dx / dist, ny = dy / dist;
    const range = this.data.range!;

    // Animate beam
    this.graphics.clear();
    const numStreams = 3;
    for (let s = 0; s < numStreams; s++) {
      const offset = (s - 1) * 8;
      const perpX = -ny * offset, perpY = nx * offset;
      this.graphics.lineStyle(6 - s*1.5, 0x0080ff, 0.8 - s*0.1);
      this.graphics.beginPath();
      this.graphics.moveTo(px + perpX, py + perpY);
      this.graphics.lineTo(px + nx * range + perpX, py + ny * range + perpY);
      this.graphics.strokePath();
    }
    this.scene.time.delayedCall(300, () => this.graphics.clear());

    // Deal damage to all enemies along stream with high knockback
    const dmg = this.calcDamage();
    const kb = this.data.knockback!;
    const streamW = 30; // half-width of stream

    for (const e of enemies) {
      if (!e.alive) continue;
      const ex = e.x - px;
      const ey = e.y - py;
      const along = ex * nx + ey * ny;
      if (along < 0 || along > range) continue;
      const perpX = ex - nx * along;
      const perpY = ey - ny * along;
      if (Math.sqrt(perpX*perpX + perpY*perpY) < streamW + e.def.hitboxSize) {
        e.hp -= dmg;
        e.knockbackX = nx * kb;
        e.knockbackY = ny * kb;
        e.knockbackTime = 350;
        if (e.hp <= 0) e.alive = false;
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
