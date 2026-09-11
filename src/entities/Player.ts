// ============================================================
// src/entities/Player.ts
// ============================================================
import Phaser from 'phaser';
import { StarterData } from '../data/starters';
import { PassiveEffect } from '../data/passives';

export interface PlayerStats {
  maxHp: number;
  hp: number;
  attack: number;
  speed: number;
  collectionRadius: number;
  critChance: number;
  cooldownMult: number;  // 1.0 = normal, 0.7 = 30% faster
  fatalBlock: boolean;
  fatalBlockUsed: boolean;
  hpRegenPercent: number; // % of max HP restored every 2 seconds
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats!: PlayerStats;
  level: number = 1;
  xp: number = 0;
  xpToNext: number = 10;
  evolutionStage: number = 0; // 0=base, 1=stage2, 2=stage3
  starterData!: StarterData;
  killCount: number = 0;

  // Passive effects accumulated from items
  passiveEffects: PassiveEffect[] = [];

  // invincibility frames after taking damage
  iframes: number = 0;

  private regenAccum = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setDepth(10);
  }

  initStats(starter: StarterData): void {
    this.starterData = starter;
    this.stats = {
      maxHp: starter.baseStats.hp,
      hp: starter.baseStats.hp,
      attack: starter.baseStats.attack,
      speed: starter.baseStats.speed,
      collectionRadius: starter.baseStats.collectionRadius,
      critChance: 0,
      cooldownMult: 1.0,
      fatalBlock: false,
      fatalBlockUsed: false,
      hpRegenPercent: 0,
    };
  }

  applyPassive(effect: PassiveEffect): void {
    this.passiveEffects.push(effect);
    if (effect.maxHpBonus)         this.stats.maxHp += effect.maxHpBonus;
    if (effect.damageBonus)        this.stats.attack += effect.damageBonus;
    if (effect.speedBonus)         this.stats.speed += effect.speedBonus;
    if (effect.magnetBonus)        this.stats.collectionRadius += effect.magnetBonus;
    if (effect.critChance)         this.stats.critChance += effect.critChance;
    if (effect.cooldownReduction)  this.stats.cooldownMult *= effect.cooldownReduction;
    if (effect.fatalBlock)         this.stats.fatalBlock = true;
    if (effect.hpRegenPercent)     this.stats.hpRegenPercent += effect.hpRegenPercent;
  }

  takeDamage(amount: number): void {
    if (this.iframes > 0) return;
    if (this.stats.hp <= amount && this.stats.fatalBlock && !this.stats.fatalBlockUsed) {
      this.stats.fatalBlockUsed = true;
      this.stats.hp = 1;
      this.setTint(0xffd700);
      this.scene.time.delayedCall(500, () => this.clearTint());
    } else {
      this.stats.hp = Math.max(0, this.stats.hp - amount);
    }
    this.iframes = 500; // ms of invincibility
    // Flash red
    this.setTint(0xff4444);
    this.scene.time.delayedCall(200, () => this.clearTint());
  }

  gainXP(amount: number): boolean {
    this.xp += amount;
    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(this.xpToNext * 1.18 + 5);
      this.stats.maxHp += 5;
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 10);
      return true; // leveled up
    }
    return false;
  }

  addStatBoost(stat: 'maxHp' | 'attack' | 'speed' | 'collectionRadius', amount: number): void {
    if (stat === 'maxHp') {
      this.stats.maxHp += amount;
      this.stats.hp += amount;
    } else if (stat === 'attack') {
      this.stats.attack += amount;
    } else if (stat === 'speed') {
      this.stats.speed += amount;
    } else if (stat === 'collectionRadius') {
      this.stats.collectionRadius += amount;
    }
  }

  get hpPercent(): number {
    return this.stats.hp / this.stats.maxHp;
  }

  get xpPercent(): number {
    return this.xp / this.xpToNext;
  }

  update(delta: number): void {
    if (this.iframes > 0) this.iframes -= delta;

    // Regenerate HP over time (leftovers-style passive)
    if (this.stats.hpRegenPercent > 0 && this.stats.hp < this.stats.maxHp) {
      // Restore hpRegenPercent% of max HP every 2 seconds
      this.regenAccum += (delta / 1000) * ((this.stats.hpRegenPercent / 100) * this.stats.maxHp) / 2;
      if (this.regenAccum >= 1) {
        const heal = Math.floor(this.regenAccum);
        this.regenAccum -= heal;
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + heal);
      }
    }
  }
}
