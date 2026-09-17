// ============================================================
// src/ui/HUD.ts — In-game heads-up display
// ============================================================
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { MoveSystem, MOVE_KEYS } from '../systems/MoveSystem';

export class HUD {
  private scene: Phaser.Scene;
  private player: Player;
  private moveSystem: MoveSystem;

  // DOM overlay (layered on top of Phaser canvas)
  private hudEl: HTMLDivElement;
  onQuitClick?: () => void;
  private hpFill: HTMLDivElement;
  private xpFill: HTMLDivElement;
  private xpText: HTMLSpanElement;
  private hpText: HTMLSpanElement;
  private levelText: HTMLSpanElement;
  private timerText: HTMLSpanElement;
  private killText: HTMLSpanElement;
  private evolutionBanner: HTMLDivElement;
  private messageBanner: HTMLDivElement;

  constructor(scene: Phaser.Scene, player: Player, moveSystem: MoveSystem) {
    this.scene = scene;
    this.player = player;
    this.moveSystem = moveSystem;

    this.hudEl = this.createHUD();
    this.hpFill      = this.hudEl.querySelector('#hud-hp-fill')!;
    this.xpFill      = this.hudEl.querySelector('#hud-xp-fill')!;
    this.xpText      = this.hudEl.querySelector('#hud-xp-text')!;
    this.hpText      = this.hudEl.querySelector('#hud-hp-text')!;
    this.levelText   = this.hudEl.querySelector('#hud-level')!;
    this.timerText   = this.hudEl.querySelector('#hud-timer')!;
    this.killText    = this.hudEl.querySelector('#hud-kills')!;
    this.evolutionBanner = this.hudEl.querySelector('#hud-evo-banner')!;
    this.messageBanner   = this.hudEl.querySelector('#hud-msg-banner')!;
  }

  private createHUD(): HTMLDivElement {
    const existing = document.getElementById('game-hud');
    if (existing) existing.remove();

    const hud = document.createElement('div');
    hud.id = 'game-hud';
    hud.innerHTML = `
      <style>
        #game-hud {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          pointer-events: none; font-family: 'Press Start 2P', monospace;
          z-index: 100; user-select: none;
        }
        /* HP Bar */
        #hud-hp-bar {
          position: absolute; top: 16px; left: 16px; width: 220px;
        }
        #hud-hp-label {
          color: #fff; font-size: 8px; margin-bottom: 4px;
          text-shadow: 1px 1px 0 #000;
          display: flex; justify-content: space-between; align-items: center;
        }
        #hud-level { color: #ffd700; font-size: 10px; }
        #hud-hp-track {
          height: 14px; background: rgba(0,0,0,0.5); border: 2px solid #fff;
          border-radius: 3px; overflow: hidden;
        }
        #hud-hp-fill {
          height: 100%; width: 100%;
          background: linear-gradient(90deg, #c0392b, #e74c3c);
          transition: width 0.2s;
        }
        #hud-hp-text {
          color: #fff; font-size: 7px;
          text-shadow: 1px 1px 0 #000;
        }
        /* XP Bar */
        #hud-xp-bar {
          position: absolute; top: 50px; left: 16px; width: 220px;
        }
        #hud-xp-label {
          color: #fff; font-size: 8px; margin-bottom: 3px;
          text-shadow: 1px 1px 0 #000;
          display: flex; justify-content: space-between; align-items: center;
        }
        #hud-xp-text { color: #9bd0ff; font-size: 7px; text-shadow: 1px 1px 0 #000; }
        #hud-xp-track {
          height: 12px; background: rgba(0,0,0,0.5); border: 2px solid #fff;
          border-radius: 3px; overflow: hidden;
        }
        #hud-xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #3498db, #9b59b6);
          transition: width 0.15s;
        }
        /* Timer & kills */
        #hud-stats {
          position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        #hud-timer {
          color: #fff; font-size: 12px; text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
          background: rgba(0,0,0,0.35); padding: 4px 10px; border-radius: 4px;
        }
        #hud-kills {
          color: #aaa; font-size: 7px; text-shadow: 1px 1px 0 #000;
        }
        /* Move slots */
        #hud-moves {
          position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%);
          display: flex; gap: 10px;
        }
        .move-slot {
          width: 68px; text-align: center;
          background: rgba(0,0,0,0.6); border: 2px solid rgba(255,255,255,0.25);
          border-radius: 6px; padding: 4px 2px;
        }
        .move-slot.active { border-color: #ffd700; box-shadow: 0 0 8px #ffd700; }
        .move-slot.toggle-on { border-color: #ff6820; box-shadow: 0 0 8px #ff6820; }
        .move-slot.toggle-off { opacity: 0.5; border-color: rgba(255,255,255,0.15); }
        .move-slot-key {
          font-size: 9px; color: #ffd700; margin-bottom: 2px;
        }
        .move-slot-name {
          font-size: 6px; color: #eee; margin-bottom: 3px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .move-slot-bar-track {
          height: 5px; background: rgba(255,255,255,0.15); border-radius: 2px; overflow: hidden;
        }
        .move-slot-bar {
          height: 100%; background: #27ae60; transition: width 0.05s;
        }
        .move-slot-empty { color: #555; font-size: 8px; padding: 8px 0; }
        /* Evolution banner */
        #hud-evo-banner {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, #ffd700, #ff8c00);
          color: #000; font-size: 12px; padding: 14px 28px;
          border-radius: 8px; text-align: center; opacity: 0;
          transition: opacity 0.3s; pointer-events: none;
          box-shadow: 0 0 30px rgba(255,215,0,0.8);
          text-shadow: none; z-index: 200;
        }
        /* Message banner */
        #hud-msg-banner {
          position: absolute; top: 30%; left: 50%;
          transform: translateX(-50%);
          color: #fff; font-size: 9px; padding: 8px 18px;
          border-radius: 4px; background: rgba(0,0,0,0.65);
          opacity: 0; transition: opacity 0.3s; z-index: 150;
          text-align: center; text-shadow: 1px 1px 0 #000;
        }
        /* Quit Button */
        #hud-btn-quit {
          position: absolute; top: 16px; right: 16px;
          pointer-events: auto;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          background: rgba(231, 76, 60, 0.85);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
          transition: all 0.15s ease;
        }
        #hud-btn-quit:hover {
          background: #e74c3c;
          transform: scale(1.05);
          box-shadow: 0 0 12px rgba(231, 76, 60, 0.8);
        }
      </style>

      <!-- Quit Button -->
      <button id="hud-btn-quit">QUIT [ESC]</button>

      <!-- HP Bar -->
      <div id="hud-hp-bar">
        <div id="hud-hp-label">
          <span>HP</span>
          <span id="hud-hp-text">20 / 20</span>
          <span id="hud-level">Lv.1</span>
        </div>
        <div id="hud-hp-track"><div id="hud-hp-fill"></div></div>
      </div>

      <!-- Timer & Kills -->
      <div id="hud-stats">
        <div id="hud-timer">00:00</div>
        <div id="hud-kills">☠ 0 killed</div>
      </div>

      <!-- XP Bar -->
      <div id="hud-xp-bar">
        <div id="hud-xp-label">
          <span>EXP</span>
          <span id="hud-xp-text">0 / 10</span>
        </div>
        <div id="hud-xp-track"><div id="hud-xp-fill" style="width:0%"></div></div>
      </div>

      <!-- Move Slots -->
      <div id="hud-moves">
        ${MOVE_KEYS.map(k => `
          <div class="move-slot" id="slot-${k}">
            <div class="move-slot-key">[${k}]</div>
            <div class="move-slot-name" id="slot-name-${k}">—</div>
            <div class="move-slot-bar-track">
              <div class="move-slot-bar" id="slot-cd-${k}" style="width:100%"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Banners -->
      <div id="hud-evo-banner"></div>
      <div id="hud-msg-banner"></div>
    `;

    hud.querySelector('#hud-btn-quit')?.addEventListener('click', () => {
      this.onQuitClick?.();
    });

    document.body.appendChild(hud);
    return hud;
  }

  update(elapsedSeconds: number): void {
    const p = this.player;

    // HP
    const hpPct = Math.max(0, p.hpPercent) * 100;
    this.hpFill.style.width = `${hpPct}%`;
    // Color HP bar based on health
    if (hpPct < 25) this.hpFill.style.background = 'linear-gradient(90deg, #8b0000, #c0392b)';
    else if (hpPct < 50) this.hpFill.style.background = 'linear-gradient(90deg, #c0392b, #e67e22)';
    else this.hpFill.style.background = 'linear-gradient(90deg, #c0392b, #e74c3c)';
    this.hpText.textContent = `${Math.ceil(p.stats.hp)} / ${p.stats.maxHp}`;

    // Level
    this.levelText.textContent = `Lv.${p.level}`;

    // XP
    this.xpFill.style.width = `${p.xpPercent * 100}%`;
    this.xpText.textContent = `${Math.floor(p.xp)} / ${p.xpToNext}`;

    // Timer
    const totalSec = Math.floor(elapsedSeconds);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    this.timerText.textContent = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;

    // Kills
    this.killText.textContent = `☠ ${p.killCount} killed`;

    // Move slots
    for (const key of MOVE_KEYS) {
      const move = this.moveSystem.getSlot(key);
      const nameEl = document.getElementById(`slot-name-${key}`)!;
      const cdEl = document.getElementById(`slot-cd-${key}`)!;
      const slotEl = document.getElementById(`slot-${key}`)!;
      slotEl.classList.remove('active', 'toggle-on', 'toggle-off');
      if (move) {
        nameEl.textContent = move.name;
        cdEl.style.width = `${move.cooldownPercent * 100}%`;
        if (move.castMode === 'auto' || move.castMode === 'toggle') {
          if (move.isAutoActive) {
            slotEl.classList.add('toggle-on');
          } else {
            slotEl.classList.add('toggle-off');
          }
        } else if (move.cooldownPercent >= 1) {
          slotEl.classList.add('active');
        }
      } else {
        nameEl.textContent = '—';
        cdEl.style.width = '100%';
      }
    }
  }

  showEvolutionBanner(text: string): void {
    this.evolutionBanner.textContent = text;
    this.evolutionBanner.style.opacity = '1';
    setTimeout(() => { this.evolutionBanner.style.opacity = '0'; }, 3000);
  }

  showMessage(text: string, durationMs = 2000): void {
    this.messageBanner.textContent = text;
    this.messageBanner.style.opacity = '1';
    setTimeout(() => { this.messageBanner.style.opacity = '0'; }, durationMs);
  }

  destroy(): void {
    this.hudEl.remove();
  }
}
