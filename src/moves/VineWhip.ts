// ============================================================
// src/moves/VineWhip.ts — Frontal cone strike
// ============================================================
import Phaser from 'phaser';
import { MoveBase } from './MoveBase';
import { MOVES } from '../data/moves';
import { Player } from '../entities/Player';
import { EnemyState } from '../entities/Enemy';

export class VineWhip extends MoveBase {
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, MOVES.vineWhip, player);
    this.graphics = scene.add.graphics().setDepth(8);
  }

  protected fire(enemies: EnemyState[]): void {
    const px = this.player.x;
    const py = this.player.y;
    const range = this.data.range!;
    const coneAngle = Math.PI * 0.55; // ~100° cone

    // Direction: toward closest enemy, else face movement direction
    const closest = this.findClosestEnemy(enemies);
    let aimAngle = 0;
    if (closest) {
      aimAngle = Math.atan2(closest.y - py, closest.x - px);
    }

    // Flash a cone graphic
    this.graphics.clear();
    this.graphics.fillStyle(0x78c850, 0.7);
    this.graphics.beginPath();
    this.graphics.moveTo(px, py);
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const a = aimAngle - coneAngle/2 + (coneAngle * i / steps);
      this.graphics.lineTo(px + Math.cos(a) * range, py + Math.sin(a) * range);
    }
    this.graphics.closePath();
    this.graphics.fillPath();

    // Draw whip line
    this.graphics.lineStyle(3, 0x48d048, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(px, py);
    this.graphics.lineTo(px + Math.cos(aimAngle) * range, py + Math.sin(aimAngle) * range);
    this.graphics.strokePath();

    this.scene.time.delayedCall(150, () => this.graphics.clear());

    // Hit enemies in cone
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - px;
      const dy = e.y - py;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > range) continue;
      const angle = Math.atan2(dy, dx);
      let angleDiff = Math.abs(angle - aimAngle);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      if (angleDiff < coneAngle / 2) {
        e.hp -= this.calcDamage();
        if (e.hp <= 0) e.alive = false;
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
