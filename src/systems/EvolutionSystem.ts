// ============================================================
// src/systems/EvolutionSystem.ts
// ============================================================
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { StarterData } from '../data/starters';
import { registerDirectionalAnimations } from '../utils/SpriteAnimationHelper';

const EVOLUTION_LEVELS = [16, 36];

export class EvolutionSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private starter: StarterData;
  private checked = new Set<number>();

  onEvolved?: (stage: number, name: string) => void;

  constructor(scene: Phaser.Scene, player: Player, starter: StarterData) {
    this.scene = scene;
    this.player = player;
    this.starter = starter;
  }

  check(): void {
    for (let i = 0; i < EVOLUTION_LEVELS.length; i++) {
      const lvl = EVOLUTION_LEVELS[i];
      const stage = i + 1; // stage 1 = evolution1, stage 2 = evolution2
      if (!this.checked.has(lvl) && this.player.level >= lvl) {
        this.checked.add(lvl);
        this.evolve(stage);
      }
    }
  }

  private evolve(stage: number): void {
    const evo = this.starter.evolutions[stage];
    if (!evo) return;

    this.player.evolutionStage = stage;
    const prevHp = this.player.stats.hp;

    // Apply bonus stats
    this.player.stats.maxHp += evo.hpBonus;
    this.player.stats.hp = Math.min(this.player.stats.maxHp, prevHp + evo.hpBonus);
    this.player.stats.attack += evo.atkBonus;
    this.player.stats.speed += evo.spdBonus;

    // Swap sprite texture if available
    const key = evo.id;
    if (this.scene.textures.exists(key)) {
      this.player.setTexture(key);
      // Ensure directional animations are registered for the evolved form
      registerDirectionalAnimations(this.scene.anims, key);
    }

    // Scale hitbox for stage
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const hitbox = stage === 1 ? 22 : 30;
    body.setSize(hitbox, hitbox);

    // Evolution effect
    this.playEvoEffect();

    if (this.onEvolved) this.onEvolved(stage, evo.name);
  }

  private playEvoEffect(): void {
    const x = this.player.x, y = this.player.y;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 40 + Math.random() * 60;
      const circle = this.scene.add.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        6, 0, 360, false, 0xffffff, 1
      );
      circle.setDepth(20);
      this.scene.tweens.add({
        targets: circle,
        x: x + Math.cos(angle) * dist * 2.5,
        y: y + Math.sin(angle) * dist * 2.5,
        alpha: 0,
        scale: 0.1,
        duration: 800,
        ease: 'Power2',
        delay: i * 20,
        onComplete: () => circle.destroy(),
      });
    }
    // Flash player
    this.player.setTint(0xffffff);
    this.scene.time.delayedCall(600, () => this.player.clearTint());
  }
}
