// ============================================================
// src/scenes/MainMenuScene.ts
// ============================================================
import Phaser from 'phaser';
import { STARTERS, StarterData } from '../data/starters';
import { PASSIVES, ALL_PASSIVES, MAX_EQUIPPED_PASSIVES } from '../data/passives';
import { MetaSystem } from '../systems/MetaSystem';

export class MainMenuScene extends Phaser.Scene {
  private meta!: MetaSystem;
  private selectedStarter = 0;
  private activeTab: 'start' | 'shop' | 'stats' = 'start';
  private shopSelectedIdx = 0;

  // DOM overlay
  private menuEl!: HTMLDivElement;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  init(data: { meta?: MetaSystem }): void {
    this.meta = data.meta ?? new MetaSystem();
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a1a');
    this.createAnimatedBg();
    this.buildDOM();
  }

  private createAnimatedBg(): void {
    // Floating silhouettes
    const enemyKeys = ['rattata', 'pidgey', 'zubat', 'gastly'];
    for (let i = 0; i < 20; i++) {
      const key = enemyKeys[i % enemyKeys.length];
      if (!this.textures.exists(key)) continue;
      const x = Math.random() * this.scale.width;
      const y = Math.random() * this.scale.height;
      const spr = this.add.sprite(x, y, key, 0);
      spr.setScale(1.5 + Math.random() * 2);
      spr.setAlpha(0.06 + Math.random() * 0.08);
      spr.setTint(0x6688cc);
      spr.setDepth(0);
      // Drift
      this.tweens.add({
        targets: spr,
        x: spr.x + (Math.random() - 0.5) * 200,
        y: spr.y + (Math.random() - 0.5) * 200,
        duration: 6000 + Math.random() * 6000,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 3000,
      });
    }
  }

  private buildDOM(): void {
    const existing = document.getElementById('main-menu');
    if (existing) existing.remove();

    // Drop any listeners registered by a previous buildDOM() call
    // (e.g. after a shop buy/equip triggers rebuildMenu()).
    this.input.keyboard!.removeAllListeners();

    const el = document.createElement('div');
    el.id = 'main-menu';
    el.innerHTML = this.getMenuHTML();
    document.body.appendChild(el);
    this.menuEl = el;

    // Wire up events
    el.querySelector('#btn-start-run')!.addEventListener('click', () => this.startRun());
    el.querySelectorAll('.starter-card').forEach((card, i) => {
      card.addEventListener('click', () => this.selectStarter(i));
    });
    el.querySelector('#tab-start')!.addEventListener('click', () => this.switchTab('start'));
    el.querySelector('#tab-shop')!.addEventListener('click', () => this.switchTab('shop'));
    el.querySelector('#tab-stats')!.addEventListener('click', () => this.switchTab('stats'));

    // Shop buttons
    el.querySelectorAll('.shop-buy-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const itemId = (e.currentTarget as HTMLElement).dataset.itemId!;
        this.buyItem(itemId);
      });
    });
    el.querySelectorAll('.shop-equip-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const itemId = (e.currentTarget as HTMLElement).dataset.itemId!;
        this.toggleEquip(itemId);
      });
    });

    this.selectStarter(0);

    // Keyboard navigation
    this.input.keyboard!.on('keydown-LEFT',  () => this.selectStarter(Math.max(0, this.selectedStarter - 1)));
    this.input.keyboard!.on('keydown-RIGHT', () => this.selectStarter(Math.min(STARTERS.length - 1, this.selectedStarter + 1)));
    this.input.keyboard!.on('keydown-ENTER', () => this.startRun());
    this.input.keyboard!.on('keydown-SPACE', () => this.startRun());
  }

  private getMenuHTML(): string {
    const coins = this.meta.coins;
    const runs  = this.meta.getTotalRuns();
    const best  = this.meta.getBestLevel();

    const shopRows = ALL_PASSIVES.map(p => {
      const owned = this.meta.purchasedItems[p.id] ?? 0;
      const equipped = this.meta.equippedItems.includes(p.id);
      const maxed = owned >= p.maxLevel;
      const nextCost = owned < p.maxLevel ? p.levels[owned].upgradeCost || p.cost : 0;
      return `
        <div class="shop-row" data-item="${p.id}">
          <span class="shop-icon">${p.icon}</span>
          <div class="shop-info">
            <div class="shop-name">${p.name} ${owned > 0 ? `<span class="shop-lvl">Lv${owned}</span>` : ''}</div>
            <div class="shop-desc">${p.description}</div>
          </div>
          <div class="shop-actions">
            ${owned > 0 ? `<button class="shop-equip-btn ${equipped ? 'equipped' : ''}" data-item-id="${p.id}">${equipped ? '✓ EQP' : 'EQUIP'}</button>` : ''}
            ${!maxed ? `<button class="shop-buy-btn" data-item-id="${p.id}">🪙${nextCost}</button>` : '<span class="shop-maxed">MAX</span>'}
          </div>
        </div>
      `;
    }).join('');

    return `
      <style>
        #main-menu {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
          z-index: 200; font-family: 'Press Start 2P', monospace;
          background: linear-gradient(180deg, rgba(10,10,26,0.92) 0%, rgba(5,5,15,0.97) 100%);
          overflow-y: auto; padding: 20px 16px 40px; box-sizing: border-box;
        }
        #menu-title {
          font-size: 26px; color: #ffd700; margin-bottom: 4px;
          text-shadow: 0 0 30px rgba(255,215,0,0.6), 2px 2px 0 #000;
          letter-spacing: 2px; text-align: center;
        }
        #menu-subtitle {
          font-size: 9px; color: #888; margin-bottom: 20px; text-align: center;
        }
        /* Tabs */
        #menu-tabs {
          display: flex; gap: 8px; margin-bottom: 20px;
        }
        .menu-tab {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
          color: #aaa; font-family: 'Press Start 2P', monospace; font-size: 8px;
          padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: all 0.2s;
        }
        .menu-tab:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .menu-tab.active { background: rgba(255,215,0,0.15); border-color: #ffd700; color: #ffd700; }
        /* Tab content */
        .tab-panel { display: none; width: 100%; max-width: 700px; }
        .tab-panel.visible { display: block; }
        /* Coins display */
        #coins-display {
          text-align: right; color: #ffd700; font-size: 9px; margin-bottom: 10px;
        }
        /* Starter cards */
        #starters-grid {
          display: flex; gap: 16px; justify-content: center; margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .starter-card {
          width: 180px; padding: 16px 12px; border-radius: 12px;
          background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.1);
          text-align: center; cursor: pointer; transition: all 0.2s;
        }
        .starter-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.3); }
        .starter-card.selected { border-color: #ffd700; background: rgba(255,215,0,0.08); box-shadow: 0 0 20px rgba(255,215,0,0.3); }
        .starter-sprite-area {
          width: 64px; height: 64px; margin: 0 auto 10px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 40px;
        }
        .starter-name { font-size: 10px; color: #fff; margin-bottom: 6px; }
        .starter-type {
          font-size: 7px; padding: 2px 8px; border-radius: 10px; display: inline-block; margin-bottom: 8px;
        }
        .type-Grass { background: #78c850; color: #000; }
        .type-Fire  { background: #f08030; color: #000; }
        .type-Water { background: #6890f0; color: #fff; }
        .starter-desc { font-size: 6px; color: #888; line-height: 1.6; }
        .starter-move { font-size: 6px; color: #aaa; margin-top: 6px; }
        /* Start button */
        #btn-start-run {
          display: block; margin: 0 auto;
          background: linear-gradient(135deg, #ffd700, #ff8c00);
          color: #000; font-family: 'Press Start 2P', monospace; font-size: 12px;
          border: none; padding: 14px 40px; border-radius: 8px; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 4px 20px rgba(255,140,0,0.5);
          letter-spacing: 1px;
        }
        #btn-start-run:hover { transform: scale(1.05); box-shadow: 0 6px 30px rgba(255,140,0,0.7); }
        #btn-start-run:active { transform: scale(0.98); }
        .controls-hint {
          text-align: center; font-size: 6px; color: #555; margin-top: 10px; line-height: 1.8;
        }
        /* Shop */
        .shop-row {
          display: flex; align-items: center; gap: 10px; padding: 10px 12px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px; margin-bottom: 8px;
        }
        .shop-icon { font-size: 22px; min-width: 32px; text-align: center; }
        .shop-info { flex: 1; }
        .shop-name { font-size: 8px; color: #fff; margin-bottom: 3px; }
        .shop-lvl { color: #ffd700; }
        .shop-desc { font-size: 6px; color: #888; }
        .shop-actions { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
        .shop-buy-btn, .shop-equip-btn {
          font-family: 'Press Start 2P', monospace; font-size: 6px;
          padding: 4px 8px; border-radius: 4px; cursor: pointer; border: none;
        }
        .shop-buy-btn { background: #27ae60; color: #fff; }
        .shop-buy-btn:hover { background: #2ecc71; }
        .shop-equip-btn { background: rgba(255,255,255,0.1); color: #aaa; border: 1px solid rgba(255,255,255,0.2); }
        .shop-equip-btn.equipped { background: rgba(255,215,0,0.2); color: #ffd700; border-color: #ffd700; }
        .shop-maxed { font-size: 6px; color: #ffd700; }
        /* Stats */
        .stats-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        }
        .stat-box {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; padding: 12px; text-align: center;
        }
        .stat-label { font-size: 6px; color: #888; margin-bottom: 6px; }
        .stat-value { font-size: 14px; color: #ffd700; }
      </style>

      <div id="menu-title">POKÉMON SURVIVOR</div>
      <div id="menu-subtitle">Survive the endless horde</div>

      <div id="menu-tabs">
        <button class="menu-tab active" id="tab-start">▶ PLAY</button>
        <button class="menu-tab" id="tab-shop">🪙 SHOP</button>
        <button class="menu-tab" id="tab-stats">📊 STATS</button>
      </div>

      <!-- PLAY TAB -->
      <div class="tab-panel visible" id="panel-start">
        <div id="starters-grid">
          ${STARTERS.map((s, i) => `
            <div class="starter-card" data-idx="${i}" id="starter-card-${i}">
              <div class="starter-sprite-area" style="background:${this.hexToRgba(s.color, 0.15)}">
                <canvas id="starter-canvas-${i}" width="64" height="64"></canvas>
              </div>
              <div class="starter-name">${s.name}</div>
              <span class="starter-type type-${s.type}">${s.type}</span>
              <div class="starter-desc">${s.description}</div>
              <div class="starter-move">Starting: ${s.startMoves[0]}</div>
            </div>
          `).join('')}
        </div>
        <button id="btn-start-run">START RUN</button>
        <div class="controls-hint">
          ARROW KEYS: move &nbsp;|&nbsp; Q/W/E/R: use moves<br>
          ARROW KEYS: navigate menus &nbsp;|&nbsp; SPACE/ENTER: confirm
        </div>
      </div>

      <!-- SHOP TAB -->
      <div class="tab-panel" id="panel-shop">
        <div id="coins-display">🪙 ${coins} PokéCoins</div>
        <div style="font-size:7px;color:#888;margin-bottom:12px">
          Equip up to ${MAX_EQUIPPED_PASSIVES} passive items per run
        </div>
        ${shopRows}
      </div>

      <!-- STATS TAB -->
      <div class="tab-panel" id="panel-stats">
        <div class="stats-grid">
          <div class="stat-box"><div class="stat-label">Total Runs</div><div class="stat-value">${runs}</div></div>
          <div class="stat-box"><div class="stat-label">Best Level</div><div class="stat-value">${best}</div></div>
          <div class="stat-box"><div class="stat-label">Total Kills</div><div class="stat-value">${this.meta.getTotalKills()}</div></div>
          <div class="stat-box"><div class="stat-label">PokéCoins</div><div class="stat-value">${coins}</div></div>
        </div>
      </div>
    `;
  }

  private hexToRgba(hex: number, alpha: number): string {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private selectStarter(idx: number): void {
    this.selectedStarter = idx;
    document.querySelectorAll('.starter-card').forEach((el, i) => {
      el.classList.toggle('selected', i === idx);
    });

    // Draw sprite preview in canvas
    for (let i = 0; i < STARTERS.length; i++) {
      const s = STARTERS[i];
      const canvasEl = document.getElementById(`starter-canvas-${i}`) as HTMLCanvasElement;
      if (!canvasEl) continue;
      const ctx = canvasEl.getContext('2d')!;
      ctx.clearRect(0, 0, 64, 64);

      const tex = this.textures.get(s.id);
      if (tex && tex.source[0]) {
        const fw = Math.floor(tex.source[0].width / 4);
        const fh = Math.floor(tex.source[0].height / 4);
        const frame = 0; // first frame
        ctx.drawImage(
          tex.source[0].image as HTMLImageElement,
          (frame % 4) * fw, Math.floor(frame / 4) * fh, fw, fh,
          0, 0, 64, 64
        );
      } else {
        // Placeholder colored circle
        const r = (s.color >> 16) & 0xff;
        const g = (s.color >> 8) & 0xff;
        const b = s.color & 0xff;
        ctx.fillStyle = `rgba(${r},${g},${b},0.8)`;
        ctx.beginPath();
        ctx.arc(32, 40, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.arc(32, 16, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private switchTab(tab: 'start' | 'shop' | 'stats'): void {
    this.activeTab = tab;
    document.querySelectorAll('.menu-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('visible'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    document.getElementById(`panel-${tab}`)?.classList.add('visible');
  }

  private buyItem(itemId: string): void {
    const passive = PASSIVES[itemId];
    if (!passive) return;
    const owned = this.meta.purchasedItems[itemId] ?? 0;
    if (owned >= passive.maxLevel) return;
    const cost = owned === 0 ? passive.cost : passive.levels[owned].upgradeCost;
    if (this.meta.purchaseItem(itemId, cost)) {
      this.rebuildMenu();
    } else {
      // Flash "not enough coins"
      const coinsEl = document.getElementById('coins-display');
      if (coinsEl) {
        coinsEl.style.color = '#e74c3c';
        setTimeout(() => { coinsEl.style.color = '#ffd700'; }, 500);
      }
    }
  }

  private toggleEquip(itemId: string): void {
    if (this.meta.equippedItems.includes(itemId)) {
      this.meta.unequipItem(itemId);
    } else {
      this.meta.equipItem(itemId);
    }
    this.rebuildMenu();
  }

  private rebuildMenu(): void {
    const tab = this.activeTab;
    const idx = this.selectedStarter;
    this.menuEl.remove();
    this.buildDOM();
    this.selectStarter(idx);
    this.switchTab(tab);
  }

  private startRun(): void {
    const starter = STARTERS[this.selectedStarter];
    this.menuEl.remove();
    this.input.keyboard!.removeAllListeners();
    this.scene.start('GameScene', {
      starter,
      meta: this.meta,
    });
  }
}
