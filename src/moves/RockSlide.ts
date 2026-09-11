// ============================================================
// src/moves/RockSlide.ts — AoE density-targeted boulder drop
// ============================================================
import Phaser from 'phaser';
import { MoveBase } from './MoveBase';
import { MOVES } from '../data/moves';
import { Player } from '../entities/Player';
import { EnemyState } from '../entities/Enemy';
import { QuadTree } from '../utils/QuadTree';

interface Boulder {
  shadow: Phaser.GameObjects.Ellipse;
  rock: Phaser.GameObjects.Arc;
  targetX: number;
  targetY: number;
  delay: number;
  dmg: number;
  aoe: number;
}

export class RockSlide extends MoveBase {
  private boulders: Boulder[] = [];
  private quadTree: QuadTree;

  constructor(scene: Phaser.Scene, player: Player, quadTree: QuadTree) {
    super(scene, MOVES.rockSlide, player);
    this.quadTree = quadTree;
  }

  protected fire(enemies: EnemyState[]): void {
    // Find densest cluster
    const dense = this.quadTree.findDensestPoint(
      this.player.x, this.player.y, 500, 80
    );
    const count = this.data.projectileCount ?? 3;
    const aoe = this.data.aoeRadius ?? 70;

    for (let i = 0; i < count; i++) {
      const tx = dense.x + (Math.random() - 0.5) * 100;
      const ty = dense.y + (Math.random() - 0.5) * 100;
      const delay = i * 200;

      // Shadow circle to telegraph impact
      const shadow = this.scene.add.ellipse(tx, ty, aoe * 2, aoe * 0.8, 0x000000, 0.3);
      shadow.setDepth(5);

      // Boulder that falls from above
      const rock = this.scene.add.arc(tx, ty - 300, aoe * 0.6, 0, 360, false, 0x808878, 1);
      rock.setDepth(15);
      rock.setStrokeStyle(2, 0x606060, 1);

      const b: Boulder = { shadow, rock, targetX: tx, targetY: ty, delay, dmg: this.calcDamage(), aoe };
      this.boulders.push(b);

      // Animate drop
      this.scene.time.delayedCall(delay, () => {
        this.scene.tweens.add({
          targets: rock,
          y: ty,
          duration: 350,
          ease: 'Quad.in',
          onComplete: () => {
            // Impact — deal AoE damage
            for (const e of enemies) {
              if (!e.alive) continue;
              const dx = e.x - tx;
              const dy = e.y - ty;
              if (dx*dx + dy*dy < (aoe + e.def.hitboxSize) * (aoe + e.def.hitboxSize)) {
                e.hp -= b.dmg;
                if (e.hp <= 0) e.alive = false;
              }
            }
            // Impact flash
            const flash = this.scene.add.arc(tx, ty, aoe * 1.2, 0, 360, false, 0xc0c0b0, 0.6);
            flash.setDepth(16);
            this.scene.tweens.add({ targets: flash, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 300, onComplete: () => flash.destroy() });

            rock.destroy();
            shadow.destroy();
            const idx = this.boulders.indexOf(b);
            if (idx !== -1) this.boulders.splice(idx, 1);
          }
        });
      });
    }
  }

  destroy(): void {
    for (const b of this.boulders) {
      b.shadow.destroy();
      b.rock.destroy();
    }
  }
}
