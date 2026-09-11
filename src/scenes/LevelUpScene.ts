// ============================================================
// src/scenes/LevelUpScene.ts — Pause overlay for card selection
// ============================================================
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { MoveSystem, MoveKey, MOVE_KEYS } from '../systems/MoveSystem';
import { MOVES, DRAFT_MOVE_POOL, MoveData } from '../data/moves';
import { PASSIVES } from '../data/passives';
import { MoveBase } from '../moves/MoveBase';
import { VineWhip } from '../moves/VineWhip';
import { Ember } from '../moves/Ember';
import { Flamethrower } from '../moves/Flamethrower';
import { WaterGun } from '../moves/WaterGun';
import { HydroPump } from '../moves/HydroPump';
import { Swift } from '../moves/Swift';
import { RockSlide } from '../moves/RockSlide';
import { RazorLeaf } from '../moves/RazorLeaf';
import { QuadTree } from '../utils/QuadTree';

type CardOption =
  | { type: 'move'; data: MoveData }
  | { type: 'stat'; stat: 'maxHp' | 'attack' | 'speed' | 'collectionRadius'; amount: number; label: string; desc: string };

export class LevelUpScene extends Phaser.Scene {
  private player!: Player;
  private moveSystem!: MoveSystem;
  private quadTree!: QuadTree;
  private cards: CardOption[] = [];
  private selectedIdx = 0;
  private el!: HTMLDivElement;
  private pendingMove: MoveData | null = null;
  private replacingSlot: MoveKey | null = null;
  private onComplete!: () => void;

  constructor() {
    super({ key: 'LevelUpScene' });
  }

  init(data: {
    player: Player;
    moveSystem: MoveSystem;
    quadTree: QuadTree;
    onComplete: () => void;
  }): void {
    this.player = data.player;
    this.moveSystem = data.moveSystem;
    this.quadTree = data.quadTree;
    this.onComplete = data.onComplete;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.cards = this.generateCards();
    this.selectedIdx = 0;
    this.pendingMove = null;
    this.replacingSlot = null;
    this.buildDOM();
    this.setupKeys();
  }

  private generateCards(): CardOption[] {
    const pool: CardOption[] = [];

    // Stat boosts
    const statOptions: CardOption[] = [
      { type: 'stat', stat: 'maxHp', amount: 30, label: '❤️ +30 Max HP', desc: 'Increase maximum health.' },
      { type: 'stat', stat: 'attack', amount: 10, label: '⚔️ +10 Attack', desc: 'Deal more damage.' },
      { type: 'stat', stat: 'speed', amount: 15, label: '👟 +15 Speed', desc: 'Move faster.' },
      { type: 'stat', stat: 'collectionRadius', amount: 30, label: '🧲 +30 XP Radius', desc: 'Collect XP from farther away.' },
    ];
    pool.push(...statOptions);

    // Move options from draft pool (exclude already-equipped moves)
    const equippedMoveIds = Array.from(this.moveSystem.getAllSlots().values()).map(m => m.id);
    const available = DRAFT_MOVE_POOL.filter(id => !equippedMoveIds.includes(id));
    // Shuffle
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    for (const id of available.slice(0, 3)) {
      pool.push({ type: 'move', data: MOVES[id] });
    }

    // Pick 3 random cards
    const selected: CardOption[] = [];
    const indices = new Set<number>();
    while (selected.length < 3 && selected.length < pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        selected.push(pool[idx]);
      }
    }
    return selected;
  }

  private buildDOM(): void {
    const existing = document.getElementById('levelup-overlay');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'levelup-overlay';
    el.innerHTML = this.getOverlayHTML();
    document.body.appendChild(el);
    this.el = el;

    el.querySelectorAll('.levelup-card').forEach((card, i) => {
      card.addEventListener('click', () => {
        this.selectedIdx = i;
        this.confirmSelection();
      });
      card.addEventListener('mouseenter', () => {
        this.selectedIdx = i;
        this.highlightCard(i);
      });
    });

    this.highlightCard(0);
  }

  private buildReplaceDOM(): void {
    const existing = document.getElementById('replace-overlay');
    if (existing) existing.remove();

    const slots = MOVE_KEYS.map(k => {
      const m = this.moveSystem.getSlot(k);
      return `<div class="replace-slot" data-key="${k}" id="replace-${k}">
        <span class="replace-key">[${k}]</span>
        <span class="replace-name">${m ? m.name : '—'}</span>
      </div>`;
    });

    const el = document.createElement('div');
    el.id = 'replace-overlay';
    el.innerHTML = `
      <style>
        #replace-overlay {
          position: fixed; inset: 0; z-index: 320;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: rgba(0,0,10,0.85); font-family: 'Press Start 2P', monospace;
        }
        #replace-overlay h2 { color: #ffd700; font-size: 12px; margin-bottom: 8px; }
        #replace-overlay p { color: #aaa; font-size: 7px; margin-bottom: 20px; text-align: center; }
        .replace-slots { display: flex; gap: 12px; }
        .replace-slot {
          width: 120px; padding: 14px 8px; text-align: center;
          background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.15);
          border-radius: 8px; cursor: pointer; transition: all 0.15s;
        }
        .replace-slot:hover { border-color: #e74c3c; background: rgba(231,76,60,0.15); }
        .replace-key { display: block; color: #ffd700; font-size: 10px; margin-bottom: 6px; }
        .replace-name { display: block; color: #eee; font-size: 7px; }
        .replace-ignore {
          margin-top: 16px; font-size: 7px; color: #666; cursor: pointer; text-decoration: underline;
        }
        .replace-ignore:hover { color: #999; }
      </style>
      <h2>FULL MOVE SLOTS!</h2>
      <p>Choose a slot to REPLACE with "${this.pendingMove?.name}"<br>or ignore to keep current moves.</p>
      <div class="replace-slots">${slots.join('')}</div>
      <div class="replace-ignore" id="replace-ignore">Ignore new move</div>
    `;
    document.body.appendChild(el);

    el.querySelectorAll('.replace-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const key = (slot as HTMLElement).dataset.key as MoveKey;
        this.confirmReplace(key);
      });
    });
    el.querySelector('#replace-ignore')!.addEventListener('click', () => {
      el.remove();
      this.finish();
    });
  }

  private getOverlayHTML(): string {
    const cardHTML = this.cards.map((c, i) => {
      const isMove = c.type === 'move';
      return `
        <div class="levelup-card" id="luc-${i}">
          <div class="luc-badge">${isMove ? '⚔️ MOVE' : '📈 STAT'}</div>
          <div class="luc-name">${isMove ? c.data.name : c.label}</div>
          <div class="luc-desc">${isMove ? c.data.description : c.desc}</div>
          ${isMove ? `<div class="luc-power">Power: ${c.data.basePower} &nbsp;|&nbsp; CD: ${(c.data.cooldown/1000).toFixed(1)}s</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <style>
        #levelup-overlay {
          position: fixed; inset: 0; z-index: 300;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: rgba(0,0,10,0.88);
          font-family: 'Press Start 2P', monospace;
          animation: luFadeIn 0.2s ease;
        }
        @keyframes luFadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        #luc-title {
          font-size: 16px; color: #ffd700; margin-bottom: 6px;
          text-shadow: 0 0 20px rgba(255,215,0,0.5);
        }
        #luc-subtitle {
          font-size: 8px; color: #888; margin-bottom: 28px;
        }
        #luc-cards {
          display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
        }
        .levelup-card {
          width: 180px; padding: 18px 14px;
          background: rgba(255,255,255,0.04);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px; cursor: pointer;
          transition: all 0.15s; text-align: center;
        }
        .levelup-card:hover { transform: translateY(-6px); }
        .levelup-card.selected {
          border-color: #ffd700;
          background: rgba(255,215,0,0.1);
          box-shadow: 0 0 24px rgba(255,215,0,0.4);
          transform: translateY(-6px) scale(1.02);
        }
        .luc-badge {
          font-size: 7px; color: #888; margin-bottom: 8px;
        }
        .luc-name {
          font-size: 10px; color: #fff; margin-bottom: 10px;
          line-height: 1.5;
        }
        .luc-desc {
          font-size: 7px; color: #aaa; line-height: 1.7; margin-bottom: 8px;
        }
        .luc-power { font-size: 6px; color: #666; }
        #luc-hint { margin-top: 20px; font-size: 6px; color: #555; }
      </style>
      <div id="luc-title">LEVEL UP!</div>
      <div id="luc-subtitle">Lv. ${this.player.level} — Choose a reward</div>
      <div id="luc-cards">${cardHTML}</div>
      <div id="luc-hint">ARROW KEYS to navigate • SPACE/ENTER to select • CLICK to pick</div>
    `;
  }

  private highlightCard(idx: number): void {
    document.querySelectorAll('.levelup-card').forEach((c, i) => {
      c.classList.toggle('selected', i === idx);
    });
  }

  private setupKeys(): void {
    this.input.keyboard!.removeAllListeners();

    this.input.keyboard!.on('keydown-LEFT', () => {
      this.selectedIdx = Math.max(0, this.selectedIdx - 1);
      this.highlightCard(this.selectedIdx);
    });
    this.input.keyboard!.on('keydown-RIGHT', () => {
      this.selectedIdx = Math.min(this.cards.length - 1, this.selectedIdx + 1);
      this.highlightCard(this.selectedIdx);
    });
    this.input.keyboard!.on('keydown-SPACE', () => this.confirmSelection());
    this.input.keyboard!.on('keydown-ENTER', () => this.confirmSelection());
  }

  private confirmSelection(): void {
    const card = this.cards[this.selectedIdx];
    if (!card) return;

    if (card.type === 'stat') {
      this.player.addStatBoost(card.stat, card.amount);
      this.finish();
    } else {
      // Move
      const freeKey = this.moveSystem.getFreeKey();
      if (freeKey) {
        const move = this.createMoveInstance(card.data.id);
        if (move) this.moveSystem.assignMove(freeKey, move);
        this.finish();
      } else {
        // All 4 slots full — ask which to replace
        this.pendingMove = card.data;
        this.el.remove();
        this.buildReplaceDOM();
      }
    }
  }

  private confirmReplace(key: MoveKey): void {
    if (!this.pendingMove) return;
    const move = this.createMoveInstance(this.pendingMove.id);
    if (move) this.moveSystem.assignMove(key, move);
    document.getElementById('replace-overlay')?.remove();
    this.finish();
  }

  private createMoveInstance(id: string): MoveBase | null {
    const scene = this.scene.get('GameScene') as Phaser.Scene;
    switch (id) {
      case 'vineWhip':    return new VineWhip(scene, this.player);
      case 'razorLeaf':   return new RazorLeaf(scene, this.player);
      case 'ember':       return new Ember(scene, this.player);
      case 'flamethrower':return new Flamethrower(scene, this.player);
      case 'waterGun':    return new WaterGun(scene, this.player);
      case 'hydroPump':   return new HydroPump(scene, this.player);
      case 'swift':       return new Swift(scene, this.player);
      case 'rockSlide':   return new RockSlide(scene, this.player, this.quadTree);
      default:            return null;
    }
  }

  private finish(): void {
    this.el?.remove();
    this.input.keyboard!.removeAllListeners();
    this.scene.stop('LevelUpScene');
    this.onComplete();
  }
}
