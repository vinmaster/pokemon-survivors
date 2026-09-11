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
  private hud!: HUD;

  private bgTile!: Phaser.GameObjects.TileSprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private elapsedTime = 0;
  private isGameOver = false;
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

    // Input Controls
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasdKeys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
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
    if (this.isGameOver) return;

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
    this.player.update(delta);

    // HUD update
    this.hud.update(Math.floor(this.elapsedTime));
  }

  private handlePlayerMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = this.player.stats.speed;

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown)  vx -= 1;
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown)    vy -= 1;
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown)  vy += 1;

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

  private triggerGameOver(): void {
    this.isGameOver = true;
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
