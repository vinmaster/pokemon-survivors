// ============================================================
// src/moves/Flamethrower.ts — Toggle beam move
// ============================================================
import Phaser from 'phaser';
import { MoveBase } from './MoveBase';
import { MOVES } from '../data/moves';
import { Player } from '../entities/Player';
import { EnemyState } from '../entities/Enemy';

export class Flamethrower extends MoveBase {
  private beam: Phaser.GameObjects.Graphics;
  private tickAccum: number = 0;
  private readonly TICK_INTERVAL = 100; // ms between damage ticks

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, MOVES.flamethrower, player);
    this.beam = scene.add.graphics().setDepth(8).setVisible(false);
  }

  protected fire(_enemies: EnemyState[]): void { /* no-op: toggle */ }

  protected tickBeam(delta: number, enemies: EnemyState[]): void {
    this.tickAccum += delta;
    const target = this.findClosestEnemy(enemies);

    this.beam.setVisible(true);
    this.beam.clear();

    if (!target) {
      this.beam.setVisible(false);
      return;
    }

    const px = this.player.x;
    const py = this.player.y;
    const dx = target.x - px;
    const dy = target.y - py;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > this.data.range!) {
      this.beam.setVisible(false);
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;

    // Draw beam as series of circles with heat gradient
    const segments = 20;
    const segLen = dist / segments;
    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const alpha = 0.8 - t * 0.4;
      const r = Math.floor(255);
      const g = Math.floor(t * 120);
      const b = 0;
      const color = (r << 16) | (g << 8) | b;
      const radius = 8 - t * 4;
      this.beam.fillStyle(color, alpha);
      this.beam.fillCircle(
        px + nx * s * segLen,
        py + ny * s * segLen,
        Math.max(2, radius)
      );
    }

    // Damage tick
    if (this.tickAccum >= this.TICK_INTERVAL) {
      this.tickAccum -= this.TICK_INTERVAL;
      const dmg = this.calcDamage();
      // Pierce: hit all enemies along beam
      for (const e of enemies) {
        if (!e.alive) continue;
        const ex = e.x - px;
        const ey = e.y - py;
        // Project onto beam direction
        const proj = ex * nx + ey * ny;
        if (proj < 0 || proj > dist + e.def.hitboxSize) continue;
        // Perpendicular distance
        const perpX = ex - nx * proj;
        const perpY = ey - ny * proj;
        const perpDist = Math.sqrt(perpX*perpX + perpY*perpY);
        if (perpDist < e.def.hitboxSize + 10) {
          e.hp -= dmg;
          if (e.hp <= 0) e.alive = false;
        }
      }
    }
  }

  update(delta: number, enemies: EnemyState[]): void {
    super.update(delta, enemies);
    if (!this.isAutoActive) {
      this.beam.setVisible(false);
      this.beam.clear();
    }
  }

  destroy(): void {
    this.beam.destroy();
  }
}
