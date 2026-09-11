// ============================================================
// src/scenes/BootScene.ts — Asset loading & sprite sheet registration
// ============================================================
import Phaser from 'phaser';
import { STARTERS } from '../data/starters';
import { ENEMIES } from '../data/enemies';
import {
  generatePlaceholderSheet,
  generateOrbTexture,
  generateGrassTile,
  generateParticle,
} from '../utils/SpriteGenerator';
import { registerDirectionalAnimations } from '../utils/SpriteAnimationHelper';

// List of all Pokémon starters & evolutions in /public/assets/
export interface SpriteConfig {
  key: string;
  path: string;
}

const POKEMON_SPRITES: SpriteConfig[] = [
  { key: 'bulbasaur',  path: 'assets/sprite_recolor-0001-0000-0001.png' },
  { key: 'ivysaur',    path: 'assets/sprite_recolor-0002-0000-0001.png' },
  { key: 'venusaur',   path: 'assets/sprite_recolor-0003-0000-0001.png' },
  { key: 'charmander', path: 'assets/sprite_recolor-0004-0000-0001.png' },
  { key: 'charmeleon', path: 'assets/sprite_recolor-0005-0000-0001.png' },
  { key: 'charizard',  path: 'assets/sprite_recolor-0006-0000-0001.png' },
  { key: 'squirtle',   path: 'assets/sprite_recolor-0007-0000-0001.png' },
  { key: 'wartortle',  path: 'assets/sprite_recolor-0008-0000-0001.png' },
  { key: 'blastoise',  path: 'assets/sprite_recolor-0009-0000-0001.png' },
];

const ENEMY_SPRITES = [
  'rattata', 'pidgey', 'zubat', 'geodude',
  'magikarp', 'gastly', 'ekans', 'snorlax', 'gengar',
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Show loading screen
    this.createLoadingUI();

    // Dynamically load the 9 Pokémon sprite sheets from /public/assets/
    for (const p of POKEMON_SPRITES) {
      this.load.image(`raw_${p.key}`, p.path);
    }

    // Attempt to load enemy sprites from /public/assets/sprites/ if available
    for (const key of ENEMY_SPRITES) {
      this.load.image(`raw_${key}`, `assets/sprites/${key}.png`);
    }

    // Handle load errors gracefully — fallback to generated placeholder
    this.load.on('filefailed', (fileKey: string) => {
      const spriteName = fileKey.replace('raw_', '');
      console.log(`[Boot] Asset missing: ${spriteName} — will use procedural placeholder`);
    });
  }

  create(): void {
    // Process loaded Pokémon images and calculate dynamic 4x4 grid dimensions
    for (const p of POKEMON_SPRITES) {
      const rawKey = `raw_${p.key}`;
      if (this.textures.exists(rawKey)) {
        const rawTex = this.textures.get(rawKey);
        const src = rawTex.source[0];
        const fw = Math.floor(src.width / 4);
        const fh = Math.floor(src.height / 4);
        console.log(`[Boot] Dynamically loaded ${p.key}: ${src.width}x${src.height} -> frame ${fw}x${fh}`);
        this.textures.addSpriteSheet(p.key, src.image as HTMLImageElement, {
          frameWidth: fw,
          frameHeight: fh,
        });
      } else {
        const def = STARTERS.find(s => s.id === p.key);
        const color = def ? def.color : 0x808080;
        const generated = generatePlaceholderSheet(p.key, color, 32);
        this.textures.addCanvas(p.key, generated.canvas);
        const tex = this.textures.get(p.key);
        this.textures.addSpriteSheet(p.key, tex, {
          frameWidth: generated.frameWidth,
          frameHeight: generated.frameHeight,
        });
      }
      this.registerAnimations(p.key);
    }

    // Process enemy sprites (or fallback to procedural placeholders)
    for (const key of ENEMY_SPRITES) {
      const rawKey = `raw_${key}`;
      if (this.textures.exists(rawKey)) {
        const rawTex = this.textures.get(rawKey);
        const src = rawTex.source[0];
        const fw = Math.floor(src.width / 4);
        const fh = Math.floor(src.height / 4);
        this.textures.addSpriteSheet(key, src.image as HTMLImageElement, {
          frameWidth: fw,
          frameHeight: fh,
        });
      } else {
        const def = Object.values(ENEMIES).find(e => e.id === key);
        const color = def ? def.color : 0x808080;
        const generated = generatePlaceholderSheet(key, color, 32);
        this.textures.addCanvas(key, generated.canvas);
        const tex = this.textures.get(key);
        this.textures.addSpriteSheet(key, tex, {
          frameWidth: generated.frameWidth,
          frameHeight: generated.frameHeight,
        });
      }
      this.registerAnimations(key);
    }

    // Generate utility textures
    this.textures.addCanvas('xp_orb', generateOrbTexture('#40e0d0', 12));
    this.textures.addCanvas('grass_tile', generateGrassTile(64));
    this.textures.addCanvas('particle_white', generateParticle('white', 8));
    this.textures.addCanvas('particle_orange', generateParticle('#ff6820', 8));
    this.textures.addCanvas('particle_blue', generateParticle('#40a0ff', 8));

    // Transition to main menu
    this.scene.start('MainMenuScene');
  }

  private registerAnimations(key: string): void {
    registerDirectionalAnimations(this.anims, key);
  }

  private createLoadingUI(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#0a0a1a');
    this.add.text(w/2, h/2 - 40, 'POKÉMON SURVIVOR', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '18px',
      color: '#ffd700',
    }).setOrigin(0.5);

    this.add.text(w/2, h/2 + 10, 'Loading...', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Progress bar
    const barW = 300, barH = 16;
    const barBg = this.add.rectangle(w/2, h/2 + 50, barW, barH, 0x222244);
    const barFill = this.add.rectangle(w/2 - barW/2, h/2 + 50, 0, barH, 0x3498db);
    barFill.setOrigin(0, 0.5);

    this.load.on('progress', (v: number) => {
      barFill.setSize(barW * v, barH);
    });
  }
}
