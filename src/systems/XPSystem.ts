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

interface MagnetPickup {
  obj: Phaser.GameObjects.Arc;
}

export class XPSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private orbs: XPOrb[] = [];
  private magnetPickups: MagnetPickup[] = [];
  private readonly MAX_ORBS = 200;
  private magnetTimer = 0;
  private readonly MAGNET_INTERVAL_MS = 40000;

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

  private spawnMagnetPickup(): void {
    if (this.magnetPickups.length >= 3) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = 250 + Math.random() * 350;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;

    const outer = this.scene.add.arc(x, y, 14, 0, 360, false, 0xffff40, 0.25);
    outer.setDepth(7);
    outer.setStrokeStyle(2, 0xffff40, 0.9);
    this.scene.tweens.add({
      targets: outer, scaleX: 1.6, scaleY: 1.6, alpha: 0,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.magnetPickups.push({ obj: outer });
  }

  private collectMagnet(pickup: MagnetPickup): void {
    pickup.obj.destroy();
    // Sucks in every XP orb currently on the floor
    for (const orb of this.orbs) orb.attracted = true;
    this.magnetPickups.splice(this.magnetPickups.indexOf(pickup), 1);
    // Visual confirmation ring
    const ring = this.scene.add.arc(this.player.x, this.player.y, 10, 0, 360, false, 0xffff40, 0.8);
    ring.setDepth(9);
    ring.setStrokeStyle(2, 0xffff40, 1);
    this.scene.tweens.add({
      targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 600,
      ease: 'Power1', onComplete: () => ring.destroy(),
    });
  }

  update(delta: number): void {
    const px = this.player.x;
    const py = this.player.y;
    const radius = this.player.stats.collectionRadius;
    const dt = delta / 1000;
    const ATTRACT_SPEED = 350;

    // Periodically spawn magnet pickups in the nearby world
    this.magnetTimer += delta;
    if (this.magnetTimer >= this.MAGNET_INTERVAL_MS) {
      this.magnetTimer = 0;
      this.spawnMagnetPickup();
    }

    // Check pickup collection
    for (let i = this.magnetPickups.length - 1; i >= 0; i--) {
      const pickup = this.magnetPickups[i];
      if (!pickup.obj.active) { this.magnetPickups.splice(i, 1); continue; }
      const dx = px - pickup.obj.x;
      const dy = py - pickup.obj.y;
      if (dx*dx + dy*dy < 26*26) {
        this.collectMagnet(pickup);
      }
    }

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
    for (const o of this.magnetPickups) o.obj.destroy();
    this.magnetPickups = [];
  }
}
