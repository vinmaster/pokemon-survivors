// ============================================================
// src/moves/MoveBase.ts — Abstract base class for all moves
// ============================================================
import Phaser from 'phaser';
import { MoveData } from '../data/moves';
import { Player } from '../entities/Player';
import { EnemyState } from '../entities/Enemy';

export abstract class MoveBase {
  protected scene: Phaser.Scene;
  protected data: MoveData;
  protected player: Player;
  cooldownRemaining: number = 0;
  isAutoActive: boolean = false;  // for auto/toggle moves

  constructor(scene: Phaser.Scene, data: MoveData, player: Player) {
    this.scene = scene;
    this.data = data;
    this.player = player;
    this.isAutoActive = data.castMode === 'auto'; // auto moves fire by default, toggle off with key
  }

  get id(): string { return this.data.id; }
  get name(): string { return this.data.name; }
  get description(): string { return this.data.description; }
  get castMode(): string { return this.data.castMode; }
  get cooldownMax(): number {
    return this.data.cooldown * this.player.stats.cooldownMult;
  }
  get cooldownPercent(): number {
    return 1 - Math.min(1, this.cooldownRemaining / this.cooldownMax);
  }

  /** Called every frame */
  update(delta: number, enemies: EnemyState[]): void {
    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - delta);

    if (this.data.castMode === 'auto' && this.isAutoActive && this.cooldownRemaining === 0) {
      this.fire(enemies);
      this.cooldownRemaining = this.cooldownMax;
    } else if (this.data.castMode === 'toggle' && this.isAutoActive) {
      this.tickBeam(delta, enemies);
    }
  }

  /** Called on key press */
  onPress(enemies: EnemyState[]): void {
    if (this.data.castMode === 'auto' || this.data.castMode === 'toggle') {
      if (this.isAutoActive) {
        // Turning off puts the move on cooldown (can't spam toggling)
        this.isAutoActive = false;
        this.cooldownRemaining = this.cooldownMax;
      } else if (this.cooldownRemaining === 0) {
        this.isAutoActive = true;
      }
      return;
    }
    if (this.cooldownRemaining > 0) return;
    this.fire(enemies);
    this.cooldownRemaining = this.cooldownMax;
  }

  protected calcDamage(isCrit = false): number {
    const base = this.data.basePower + this.player.stats.attack;
    const crit = (Math.random() < this.player.stats.critChance) ? 1.5 : 1;
    return Math.round(base * crit);
  }

  protected findClosestEnemy(enemies: EnemyState[]): EnemyState | null {
    let closest: EnemyState | null = null;
    let minDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const d = dx*dx + dy*dy;
      if (d < minDist) { minDist = d; closest = e; }
    }
    return closest;
  }

  protected findRandomAliveEnemy(enemies: EnemyState[]): EnemyState | null {
    const alive = enemies.filter(e => e.alive);
    if (alive.length === 0) return null;
    return alive[Math.floor(Math.random() * alive.length)];
  }

  protected abstract fire(enemies: EnemyState[]): void;
  protected tickBeam(_delta: number, _enemies: EnemyState[]): void { /* override in beam moves */ }

  /** Clean up any GameObjects owned by this move. */
  destroy(): void { /* override in moves that hold visuals */ }
}
