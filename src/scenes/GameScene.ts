// ============================================================
// src/scenes/GameScene.ts — Main gameplay scene
// ============================================================
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { StarterData } from '../data/starters';
import { MetaSystem } from '../systems/MetaSystem';
import { QuadTree } from '../utils/QuadTree';
import { EnemySystem } from '../systems/EnemySystem';
import { MoveSystem } from '../systems/MoveSystem';
import { XPSystem } from '../systems/XPSystem';
import { EvolutionSystem } from '../systems/EvolutionSystem';
import { AchievementSystem } from '../systems/AchievementSystem';
import { HUD } from '../ui/HUD';
import { PASSIVES } from '../data/passives';
import { VineWhip } from '../moves/VineWhip';
import { Ember } from '../moves/Ember';
import { WaterGun } from '../moves/WaterGun';
import { getDirection8, isMirroredDirection } from '../utils/SpriteAnimationHelper';

const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 6000;

export class GameScene extends Phaser.Scene {
  private starter!: StarterData;
  private meta!: MetaSystem;

  private player!: Player;
  private quadTree!: QuadTree;
  private enemySystem!: EnemySystem;
  private moveSystem!: MoveSystem;
  private xpSystem!: XPSystem;
  private evolutionSystem!: EvolutionSystem;
  private achievementSystem!: AchievementSystem;
  private hud!: HUD;

  private bgTile!: Phaser.GameObjects.TileSprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private elapsedTime = 0;
  private isGameOver = false;
  private isPaused = false;
  private pauseEl?: HTMLDivElement;
  private levelUpPending = false;
  private currentDirection = 'down';

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { starter: StarterData; meta: MetaSystem }): void {
    this.starter = data.starter;
    this.meta = data.meta;
    this.elapsedTime = 0;
    this.isGameOver = false;
    this.levelUpPending = false;
  }

  create(): void {
    // World bounds & Physics
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Infinite scrolling background
    this.bgTile = this.add.tileSprite(
      0, 0,
      this.cameras.main.width + 128,
      this.cameras.main.height + 128,
      'grass_tile'
    );
    this.bgTile.setOrigin(0, 0);
    this.bgTile.setScrollFactor(0);
    this.bgTile.setDepth(-100);

    // Spatial QuadTree
    this.quadTree = new QuadTree({ x: 0, y: 0, w: WORLD_WIDTH, h: WORLD_HEIGHT });

    // Spawn Player at center of map
    const spawnX = WORLD_WIDTH / 2;
    const spawnY = WORLD_HEIGHT / 2;
    this.player = new Player(this, spawnX, spawnY, this.starter.id);
    this.player.initStats(this.starter);
    this.player.setCollideWorldBounds(true);

    // Apply equipped passives from Meta progression
    if (this.meta && this.meta.equippedItems) {
      for (const itemId of this.meta.equippedItems) {
        const item = PASSIVES[itemId];
        const level = this.meta.purchasedItems[itemId] ?? 1;
        if (item) {
          const levelIdx = Math.max(0, Math.min(item.levels.length - 1, level - 1));
          const effect = item.levels[levelIdx]?.effect;
          if (effect) {
            this.player.applyPassive(effect);
          }
        }
      }
    }

    // Camera setup
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    // Systems
    this.enemySystem = new EnemySystem(this, this.player, this.quadTree);

    this.moveSystem = new MoveSystem(this, this.player);

    // Assign starter's signature move to slot 'Q'
    this.assignStarterMove();

    this.xpSystem = new XPSystem(this, this.player);
    this.xpSystem.onLevelUp = () => this.handleLevelUp();

    this.evolutionSystem = new EvolutionSystem(this, this.player, this.starter);
    this.evolutionSystem.onEvolved = (_stage, name) => {
      this.hud.showEvolutionBanner(`${name} unlocked!`);
      // Update flipX and play walking animation with new evolved sprite
      this.player.setFlipX(isMirroredDirection(this.currentDirection));
      const animKey = `${name.toLowerCase()}_walk_${this.currentDirection}`;
      if (this.anims.exists(animKey)) {
        this.player.anims.play(animKey, true);
      }
    };

    // HUD overlay
    this.hud = new HUD(this, this.player, this.moveSystem);

    // Kill milestone achievements
    this.achievementSystem = new AchievementSystem(this.player, this.meta);
    this.achievementSystem.onUnlock = (label, reward) => {
      this.hud.showMessage(`🏆 ${label} — +${reward} PokéCoins`, 3000);
    };

    // Input Controls: Movement solely controlled via arrow keys (WASD removed to avoid conflicting with Q/W/E/R moves)
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();

    // Pause / Quit controls
    this.hud.onQuitClick = () => this.togglePause();
    kb.on('keydown-ESC', () => this.togglePause());
  }

  private assignStarterMove(): void {
    const moveId = this.starter.startMoves[0];
    if (moveId === 'vineWhip') {
      this.moveSystem.assignMove('Q', new VineWhip(this, this.player));
    } else if (moveId === 'ember') {
      this.moveSystem.assignMove('Q', new Ember(this, this.player));
    } else if (moveId === 'waterGun') {
      this.moveSystem.assignMove('Q', new WaterGun(this, this.player));
    }
  }

  private handleLevelUp(): void {
    if (this.levelUpPending) return;
    this.levelUpPending = true;
    this.scene.pause('GameScene');
    this.scene.launch('LevelUpScene', {
      player: this.player,
      moveSystem: this.moveSystem,
      quadTree: this.quadTree,
      onComplete: () => {
        this.levelUpPending = false;
        this.scene.resume('GameScene');
      },
    });
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver || this.isPaused) return;

    // Check Player Death
    if (this.player.stats.hp <= 0) {
      this.triggerGameOver();
      return;
    }

    this.elapsedTime += delta / 1000;

    // Background tile scrolling
    this.bgTile.tilePositionX = this.cameras.main.scrollX;
    this.bgTile.tilePositionY = this.cameras.main.scrollY;

    // Player movement
    this.handlePlayerMovement();

    // QuadTree reset and enemy update
    this.quadTree.clear();
    this.enemySystem.update(delta);
    this.enemySystem.processDeaths(this.xpSystem);

    // Systems update
    this.moveSystem.update(delta, this.enemySystem.enemies);
    this.xpSystem.update(delta);
    this.evolutionSystem.check();
    this.achievementSystem.check();
    this.player.update(delta);

    // HUD update
    this.hud.update(Math.floor(this.elapsedTime));
  }

  private handlePlayerMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = this.player.stats.speed;

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown)  vx -= 1;
    if (this.cursors.right.isDown) vx += 1;
    if (this.cursors.up.isDown)    vy -= 1;
    if (this.cursors.down.isDown)  vy += 1;

    if (vx !== 0 && vy !== 0) {
      // Normalize diagonal speed
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    body.setVelocity(vx * speed, vy * speed);

    // Determine current sprite key (takes evolutions into account)
    const currentKey = this.player.texture.key;

    if (vx !== 0 || vy !== 0) {
      this.currentDirection = getDirection8(vx, vy);
      this.player.setFlipX(isMirroredDirection(this.currentDirection));

      const animKey = `${currentKey}_walk_${this.currentDirection}`;
      if (this.anims.exists(animKey)) {
        this.player.anims.play(animKey, true);
      }
    } else {
      this.player.setFlipX(isMirroredDirection(this.currentDirection));
      const idleKey = `${currentKey}_idle_${this.currentDirection}`;
      const defaultIdleKey = `${currentKey}_idle`;
      if (this.anims.exists(idleKey)) {
        this.player.anims.play(idleKey, true);
      } else if (this.anims.exists(defaultIdleKey)) {
        this.player.anims.play(defaultIdleKey, true);
      }
    }
  }

  private togglePause(): void {
    if (this.isGameOver || this.levelUpPending) return;
    if (this.isPaused) {
      this.resumeRun();
    } else {
      this.showPauseMenu();
    }
  }

  private showPauseMenu(): void {
    this.isPaused = true;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body?.setVelocity(0, 0);

    const time = Math.floor(this.elapsedTime);
    const min = Math.floor(time / 60);
    const sec = time % 60;
    const timeStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    const coins = Math.floor(this.player.killCount / 3) + this.player.level;

    const el = document.createElement('div');
    el.id = 'pause-overlay';
    el.innerHTML = `
      <style>
        #pause-overlay {
          position: fixed; inset: 0; z-index: 500;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: rgba(10, 10, 26, 0.88); backdrop-filter: blur(4px);
          font-family: 'Press Start 2P', monospace; user-select: none;
          animation: pauseFadeIn 0.2s ease;
        }
        @keyframes pauseFadeIn { from { opacity: 0; } to { opacity: 1; } }
        #pause-title {
          font-size: 24px; color: #ffd700; margin-bottom: 24px;
          text-shadow: 0 0 20px rgba(255,215,0,0.6), 2px 2px 0 #000;
        }
        .pause-stats {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
          margin-bottom: 24px; width: 340px;
        }
        .pause-stat {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px; padding: 10px; text-align: center;
        }
        .pause-stat-lbl { font-size: 6px; color: #888; margin-bottom: 4px; }
        .pause-stat-val { font-size: 13px; color: #fff; }
        .pause-coins {
          font-size: 9px; color: #ffd700; margin-bottom: 24px;
          background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.25);
          padding: 8px 16px; border-radius: 6px;
        }
        .pause-actions { display: flex; flex-direction: column; gap: 12px; width: 260px; }
        .pause-btn {
          font-family: 'Press Start 2P', monospace; font-size: 10px;
          border: none; padding: 12px 20px; border-radius: 6px;
          cursor: pointer; transition: all 0.15s;
        }
        #btn-resume {
          background: linear-gradient(135deg, #27ae60, #2ecc71);
          color: #fff; box-shadow: 0 4px 14px rgba(39,174,96,0.4);
        }
        #btn-resume:hover { transform: scale(1.04); }
        #btn-quit-run {
          background: linear-gradient(135deg, #c0392b, #e74c3c);
          color: #fff; box-shadow: 0 4px 14px rgba(192,57,43,0.4);
        }
        #btn-quit-run:hover { transform: scale(1.04); }
        .pause-hint { font-size: 7px; color: #666; margin-top: 16px; }
      </style>
      <div id="pause-title">GAME PAUSED</div>
      <div class="pause-stats">
        <div class="pause-stat"><div class="pause-stat-lbl">Time Survived</div><div class="pause-stat-val">${timeStr}</div></div>
        <div class="pause-stat"><div class="pause-stat-lbl">Level Reached</div><div class="pause-stat-val">${this.player.level}</div></div>
        <div class="pause-stat"><div class="pause-stat-lbl">Enemies Defeated</div><div class="pause-stat-val">${this.player.killCount}</div></div>
        <div class="pause-stat"><div class="pause-stat-lbl">Current HP</div><div class="pause-stat-val">${this.player.stats.hp}/${this.player.stats.maxHp}</div></div>
      </div>
      <div class="pause-coins">🪙 ~${coins} PokéCoins earned so far</div>
      <div class="pause-actions">
        <button class="pause-btn" id="btn-resume">RESUME</button>
        <button class="pause-btn" id="btn-quit-run">QUIT RUN</button>
      </div>
      <div class="pause-hint">ESC to resume</div>
    `;

    document.body.appendChild(el);
    this.pauseEl = el;

    el.querySelector('#btn-resume')?.addEventListener('click', () => this.resumeRun());
    el.querySelector('#btn-quit-run')?.addEventListener('click', () => this.quitRun());
  }

  private resumeRun(): void {
    this.pauseEl?.remove();
    this.pauseEl = undefined;
    document.getElementById('pause-overlay')?.remove();
    this.isPaused = false;
  }

  private quitRun(): void {
    this.resumeRun();
    this.triggerGameOver();
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.pauseEl?.remove();
    this.pauseEl = undefined;
    document.getElementById('pause-overlay')?.remove();
    this.hud.destroy();
    this.enemySystem.destroy();
    this.xpSystem.destroyAll();
    for (const move of this.moveSystem.getAllSlots().values()) {
      move.destroy();
    }
    document.getElementById('levelup-overlay')?.remove();
    document.getElementById('replace-overlay')?.remove();
    this.scene.start('GameOverScene', {
      level: this.player.level,
      kills: this.player.killCount,
      timeSeconds: Math.floor(this.elapsedTime),
      meta: this.meta,
    });
  }
}
