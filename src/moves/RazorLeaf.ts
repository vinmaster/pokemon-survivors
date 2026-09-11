// ============================================================
// src/moves/RazorLeaf.ts — 8-directional leaf burst
// ============================================================
import Phaser from 'phaser';
import { MoveBase } from './MoveBase';
import { MOVES } from '../data/moves';
import { Player } from '../entities/Player';
import { EnemyState } from '../entities/Enemy';

interface LeafProj {
  obj: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
}

export class RazorLeaf extends MoveBase {
  private leaves: LeafProj[] = [];

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, MOVES.razorLeaf, player);
  }

  protected fire(_enemies: EnemyState[]): void {
    const count = this.data.projectileCount ?? 8;
    const speed = 240;
    const dmg = this.calcDamage();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const leaf = this.scene.add.arc(this.player.x, this.player.y, 5, 0, 360, false, 0x48d048, 1);
      leaf.setDepth(9);
      this.leaves.push({ obj: leaf, vx, vy, dmg, life: 0 });
    }
  }

  update(delta: number, enemies: EnemyState[]): void {
    super.update(delta, enemies);
    const dt = delta / 1000;
    const maxLife = 1500;

    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const l = this.leaves[i];
      l.life += delta;
      if (!l.obj.active || l.life > maxLife) {
        l.obj.destroy();
        this.leaves.splice(i, 1);
        continue;
      }
      l.obj.x += l.vx * dt;
      l.obj.y += l.vy * dt;
      l.obj.angle += 8;

      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - l.obj.x;
        const dy = e.y - l.obj.y;
        if (dx*dx + dy*dy < (e.def.hitboxSize + 5) * (e.def.hitboxSize + 5)) {
          e.hp -= l.dmg;
          if (e.hp <= 0) e.alive = false;
          l.obj.destroy();
          this.leaves.splice(i, 1);
          break;
        }
      }
    }
  }

  destroy(): void {
    for (const l of this.leaves) l.obj.destroy();
  }
}
