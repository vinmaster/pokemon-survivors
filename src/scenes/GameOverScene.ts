// ============================================================
// src/scenes/GameOverScene.ts
// ============================================================
import Phaser from 'phaser';
import { MetaSystem } from '../systems/MetaSystem';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: {
    level: number;
    kills: number;
    timeSeconds: number;
    meta: MetaSystem;
  }): void {
    data.meta.recordRunEnd(data.level, data.kills, data.timeSeconds);
    this.buildDOM(data.level, data.kills, data.timeSeconds, data.meta);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a1a');
    this.input.keyboard!.once('keydown-ENTER', () => this.goMenu());
    this.input.keyboard!.once('keydown-SPACE', () => this.goMenu());
  }

  private buildDOM(level: number, kills: number, time: number, meta: MetaSystem): void {
    const existing = document.getElementById('gameover-screen');
    if (existing) existing.remove();

    const min = Math.floor(time / 60);
    const sec = time % 60;
    const timeStr = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    const coins = Math.floor(kills / 3) + level;

    const el = document.createElement('div');
    el.id = 'gameover-screen';
    el.innerHTML = `
      <style>
        #gameover-screen {
          position: fixed; inset: 0; z-index: 400;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: linear-gradient(180deg, #0a0a1a 0%, #1a0a0a 100%);
          font-family: 'Press Start 2P', monospace;
          animation: goFadeIn 0.5s ease;
        }
        @keyframes goFadeIn { from { opacity: 0; } to { opacity: 1; } }
        #go-title {
          font-size: 32px; color: #e74c3c; margin-bottom: 8px;
          text-shadow: 0 0 40px rgba(231,76,60,0.8), 2px 2px 0 #000;
          animation: goFlicker 1.5s infinite alternate;
        }
        @keyframes goFlicker {
          0% { text-shadow: 0 0 40px rgba(231,76,60,0.8), 2px 2px 0 #000; }
          100% { text-shadow: 0 0 60px rgba(231,76,60,1), 2px 2px 0 #000; }
        }
        #go-sub { font-size: 8px; color: #888; margin-bottom: 36px; }
        .go-stats {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
          margin-bottom: 32px; width: 380px;
        }
        .go-stat {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; padding: 14px 12px; text-align: center;
        }
        .go-stat-label { font-size: 6px; color: #666; margin-bottom: 6px; }
        .go-stat-val { font-size: 16px; color: #ffd700; }
        .go-coins {
          font-size: 9px; color: #ffd700; margin-bottom: 28px;
          background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3);
          padding: 10px 20px; border-radius: 8px;
        }
        #go-btn {
          font-family: 'Press Start 2P', monospace; font-size: 11px;
          background: linear-gradient(135deg, #3498db, #9b59b6);
          color: #fff; border: none; padding: 14px 36px; border-radius: 8px;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(52,152,219,0.4);
        }
        #go-btn:hover { transform: scale(1.05); }
        .go-hint { font-size: 6px; color: #555; margin-top: 12px; }
      </style>
      <div id="go-title">FAINTED!</div>
      <div id="go-sub">Your Pokémon couldn't go on...</div>
      <div class="go-stats">
        <div class="go-stat"><div class="go-stat-label">Level Reached</div><div class="go-stat-val">${level}</div></div>
        <div class="go-stat"><div class="go-stat-label">Enemies Defeated</div><div class="go-stat-val">${kills}</div></div>
        <div class="go-stat"><div class="go-stat-label">Time Survived</div><div class="go-stat-val">${timeStr}</div></div>
        <div class="go-stat"><div class="go-stat-label">Total PokéCoins</div><div class="go-stat-val">${meta.coins}</div></div>
      </div>
      <div class="go-coins">+ ${coins} 🪙 PokéCoins earned this run!</div>
      <button id="go-btn">RETURN TO MENU</button>
      <div class="go-hint">SPACE / ENTER to continue</div>
    `;
    document.body.appendChild(el);
    el.querySelector('#go-btn')!.addEventListener('click', () => this.goMenu());
  }

  private goMenu(): void {
    document.getElementById('gameover-screen')?.remove();
    this.scene.start('MainMenuScene', { meta: this.scene.settings.data as MetaSystem });
  }
}
