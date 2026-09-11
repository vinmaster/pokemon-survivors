// ============================================================
// src/systems/XPSystem.ts — XP orbs, magnet, level-up trigger
// ============================================================
import Phaser from 'phaser';
import { Player } from '../entities/Player';

interface XPOrb {
  obj: Phaser.GameObjects.Arc;
  value: number;
  x: number;
  y: number;
  attracted: boolean;
}

export class XPSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private orbs: XPOrb[] = [];
  private readonly MAX_ORBS = 200;

  onLevelUp?: () => void;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
  }

  spawnOrb(x: number, y: number, value: number): void {
    if (this.orbs.length >= this.MAX_ORBS) {
      // Reuse oldest orb
      const old = this.orbs.shift()!;
      old.obj.destroy();
    }

    // Color by value
    let color = 0x40e0d0; // default teal
    if (value >= 30) color = 0xffd700;     // gold (boss)
    else if (value >= 10) color = 0xc080ff; // purple (mid)
    else if (value >= 5) color = 0x80c0ff;  // blue (hard enemy)

    const radius = value >= 30 ? 9 : value >= 5 ? 7 : 5;
    const orb = this.scene.add.arc(x, y, radius, 0, 360, false, color, 1);
    orb.setDepth(7);
    orb.setStrokeStyle(1, 0xffffff, 0.6);

    this.orbs.push({ obj: orb, value, x, y, attracted: false });
  }

  update(delta: number): void {
    const px = this.player.x;
    const py = this.player.y;
    const radius = this.player.stats.collectionRadius;
    const dt = delta / 1000;
    const ATTRACT_SPEED = 350;

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      if (!orb.obj.active) { this.orbs.splice(i, 1); continue; }

      const dx = px - orb.obj.x;
      const dy = py - orb.obj.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < radius || orb.attracted) {
        orb.attracted = true;
        // Move toward player
        if (dist > 5) {
          orb.obj.x += (dx / dist) * ATTRACT_SPEED * dt;
          orb.obj.y += (dy / dist) * ATTRACT_SPEED * dt;
        } else {
          // Collected
          const leveled = this.player.gainXP(orb.value);
          orb.obj.destroy();
          this.orbs.splice(i, 1);
          if (leveled && this.onLevelUp) {
            this.onLevelUp();
            break; // pause processing: the scene pauses for the level-up overlay
          }
        }
      }
    }
  }

  get orbCount(): number { return this.orbs.length; }

  destroyAll(): void {
    for (const o of this.orbs) o.obj.destroy();
    this.orbs = [];
  }
}
