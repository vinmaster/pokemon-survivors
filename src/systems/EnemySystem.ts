// ============================================================
// src/systems/EnemySystem.ts
// Manages spawning, AI movement, and sprite rendering for
// hundreds of enemies.
// ============================================================
import Phaser from 'phaser';
import { EnemyState, createEnemy } from '../entities/Enemy';
import { EnemyDef, ENEMIES, WAVES, WaveDef } from '../data/enemies';
import { Player } from '../entities/Player';
import { QuadTree } from '../utils/QuadTree';
import { getDirection8, isMirroredDirection } from '../utils/SpriteAnimationHelper';

const WORLD_SIZE = 6000;

export class EnemySystem {
  private scene: Phaser.Scene;
  private player: Player;
  private quadTree: QuadTree;

  enemies: EnemyState[] = [];
  private readonly POOL_SIZE = 1000;
  private sprites: Map<number, Phaser.GameObjects.Sprite> = new Map();

  // Wave management
  private elapsedSeconds = 0;
  private wavesTriggered: Set<number> = new Set();
  private spawnTimer = 0;
  private pendingSpawns: Array<{ def: EnemyDef; delay: number }> = [];

  constructor(scene: Phaser.Scene, player: Player, quadTree: QuadTree) {
    this.scene = scene;
    this.player = player;
    this.quadTree = quadTree;
  }

  update(delta: number): void {
    this.elapsedSeconds += delta / 1000;

    // Check for new waves
    for (let i = 0; i < WAVES.length; i++) {
      const w = WAVES[i];
      if (!this.wavesTriggered.has(i) && this.elapsedSeconds >= w.time) {
        this.wavesTriggered.add(i);
        this.scheduleWave(w);
      }
    }

    // Process pending spawns
    this.spawnTimer += delta;
    while (this.pendingSpawns.length > 0 && this.pendingSpawns[0].delay <= this.spawnTimer) {
      const s = this.pendingSpawns.shift()!;
      this.spawnEnemy(s.def);
    }

    // Rebuild QuadTree
    this.quadTree.clear();

    // Update enemy positions
    const dt = delta / 1000;
    for (const e of this.enemies) {
      if (!e.alive) continue;

      let dx = this.player.x - e.x;
      let dy = this.player.y - e.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // Knockback
      if (e.knockbackTime > 0) {
        e.knockbackTime -= delta;
        e.x += e.knockbackX * dt;
        e.y += e.knockbackY * dt;
        // Dampen knockback
        e.knockbackX *= 0.85;
        e.knockbackY *= 0.85;
      } else if (dist > 0) {
        // Seek player
        const speed = e.def.speed;
        e.x += (dx / dist) * speed * dt;
        e.y += (dy / dist) * speed * dt;
      }

      // Register in QuadTree
      this.quadTree.insert({ x: e.x, y: e.y, id: e.id });

      // Contact damage to player
      if (dist < e.def.hitboxSize + 14) {
        this.player.takeDamage(e.def.damage * dt);
      }
    }

    // Update visual positions
    this.updateVisuals();
  }

  private updateVisuals(): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const sprite = this.sprites.get(e.id);
      if (!sprite) continue;

      sprite.setPosition(e.x, e.y);

      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dir = getDirection8(dx, dy);
      sprite.setFlipX(isMirroredDirection(dir));

      const key = e.def.spriteKey ?? e.def.id;
      const animKey = `${key}_walk_${dir}`;
      if (this.scene.anims.exists(animKey) && sprite.anims.currentAnim?.key !== animKey) {
        sprite.play(animKey, true);
      }
    }
  }

  private scheduleWave(wave: WaveDef): void {
    const def = ENEMIES[wave.enemyId];
    if (!def) return;
    const baseDelay = this.spawnTimer;
    for (let i = 0; i < wave.count; i++) {
      this.pendingSpawns.push({
        def,
        delay: baseDelay + i * wave.spawnInterval,
      });
    }
    this.pendingSpawns.sort((a, b) => a.delay - b.delay);
  }

  private spawnEnemy(def: EnemyDef): void {
    if (this.enemies.length >= this.POOL_SIZE) return;

    // Spawn off-screen
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 480 + Math.random() * 100;
    const sx = this.player.x + Math.cos(angle) * spawnDist;
    const sy = this.player.y + Math.sin(angle) * spawnDist;

    const e = createEnemy(def, sx, sy);
    this.enemies.push(e);

    // Create visual
    const key = def.spriteKey ?? def.id;
    const spr = this.scene.add.sprite(sx, sy, key);
    spr.setScale(def.scale);
    spr.setOrigin(0.5, 1);
    spr.setDepth(6 + (def.isBoss ? 2 : 0));
    this.sprites.set(e.id, spr);
  }

  onEnemyDied(e: EnemyState, xpSystem: { spawnOrb(x: number, y: number, value: number): void }): void {
    xpSystem.spawnOrb(e.x, e.y, e.def.xpDrop);
    this.player.killCount++;

    // Death flash / cleanup of the visual
    const sprite = this.sprites.get(e.id);
    if (sprite) {
      this.scene.tweens.add({
        targets: sprite, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 150,
        onComplete: () => { sprite.destroy(); this.sprites.delete(e.id); }
      });
    }
  }

  processDeaths(xpSystem: { spawnOrb(x: number, y: number, value: number): void }): void {
    for (const e of this.enemies) {
      if (!e.alive) this.onEnemyDied(e, xpSystem);
    }
    // Dead enemies are removed only after their rewards have been granted.
    this.enemies = this.enemies.filter(e => e.alive);
  }

  getAliveCount(): number {
    return this.enemies.filter(e => e.alive).length;
  }

  destroy(): void {
    for (const spr of this.sprites.values()) {
      if (spr.active) spr.destroy();
    }
    this.sprites.clear();
  }
}