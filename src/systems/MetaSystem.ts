// ============================================================
// src/systems/MetaSystem.ts — localStorage persistence
// ============================================================
import { ALL_PASSIVES, MAX_EQUIPPED_PASSIVES, PASSIVES } from '../data/passives';

export interface MetaData {
  coins: number;
  purchasedItems: Record<string, number>; // itemId -> level purchased (1-based)
  equippedItems: string[];                // up to 4 item ids
  achievements: Record<string, boolean>;
  totalKills: number;
  totalRuns: number;
  bestLevel: number;
  bestTime: number; // seconds
}

const SAVE_KEY = 'pokemonSurvivor_meta_v1';

function defaultMeta(): MetaData {
  return {
    coins: 0,
    purchasedItems: {},
    equippedItems: [],
    achievements: {},
    totalKills: 0,
    totalRuns: 0,
    bestLevel: 0,
    bestTime: 0,
  };
}

export class MetaSystem {
  private data: MetaData;

  constructor() {
    this.data = this.load();
  }

  private load(): MetaData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return { ...defaultMeta(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return defaultMeta();
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch { /* ignore */ }
  }

  get coins(): number { return this.data.coins; }

  addCoins(amount: number): void {
    this.data.coins += amount;
    this.save();
  }

  get purchasedItems(): Record<string, number> { return this.data.purchasedItems; }
  get equippedItems(): string[] { return this.data.equippedItems; }

  purchaseItem(itemId: string, cost: number): boolean {
    if (this.data.coins < cost) return false;
    this.data.coins -= cost;
    const currentLevel = this.data.purchasedItems[itemId] ?? 0;
    this.data.purchasedItems[itemId] = currentLevel + 1;
    this.save();
    return true;
  }

  equipItem(itemId: string): boolean {
    if (this.data.equippedItems.includes(itemId)) return false;
    if (this.data.equippedItems.length >= MAX_EQUIPPED_PASSIVES) return false;
    if (!this.data.purchasedItems[itemId]) return false;
    this.data.equippedItems.push(itemId);
    this.save();
    return true;
  }

  unequipItem(itemId: string): void {
    const idx = this.data.equippedItems.indexOf(itemId);
    if (idx !== -1) {
      this.data.equippedItems.splice(idx, 1);
      this.save();
    }
  }

  isAchievementUnlocked(key: string): boolean {
    return !!this.data.achievements[key];
  }

  unlockAchievement(key: string, reward: number): boolean {
    if (this.data.achievements[key]) return false;
    this.data.achievements[key] = true;
    this.data.coins += reward;
    this.save();
    return true;
  }

  totalCoinsSpent(): number {
    let total = 0;
    for (const [id, level] of Object.entries(this.data.purchasedItems)) {
      const p = PASSIVES[id];
      if (!p) continue;
      for (let lvl = 1; lvl <= level; lvl++) {
        total += lvl === 1 ? p.cost : (p.levels[lvl - 1]?.upgradeCost ?? 0);
      }
    }
    return total;
  }

  resetShop(): number {
    const spent = this.totalCoinsSpent();
    this.data.purchasedItems = {};
    this.data.equippedItems = [];
    this.data.coins += spent;
    this.save();
    return spent;
  }

  recordRunEnd(level: number, kills: number, timeSeconds: number): void {
    this.data.totalRuns++;
    this.data.totalKills += kills;
    if (level > this.data.bestLevel) this.data.bestLevel = level;
    if (timeSeconds > this.data.bestTime) this.data.bestTime = timeSeconds;

    // Award coins from achievements
    const awards: { key: string; condition: () => boolean; reward: number; label: string }[] = [
      { key: 'firstRun',    condition: () => this.data.totalRuns >= 1,     reward: 20,  label: 'First Run' },
      { key: 'level10',     condition: () => level >= 10,                   reward: 15,  label: 'Reach Level 10' },
      { key: 'level20',     condition: () => level >= 20,                   reward: 30,  label: 'Reach Level 20' },
      { key: 'level30',     condition: () => level >= 30,                   reward: 50,  label: 'Reach Level 30' },
      { key: 'kills100',    condition: () => kills >= 100,                  reward: 10,  label: '100 Kills' },
      { key: 'kills1000',   condition: () => kills >= 1000,                 reward: 40,  label: '1000 Kills' },
      { key: 'kills5000',   condition: () => this.data.totalKills >= 5000,  reward: 100, label: '5000 Total Kills' },
      { key: 'survive5min', condition: () => timeSeconds >= 300,            reward: 25,  label: 'Survive 5 Minutes' },
      { key: 'survive10min',condition: () => timeSeconds >= 600,            reward: 60,  label: 'Survive 10 Minutes' },
      { key: 'evolved',     condition: () => level >= 16,                   reward: 30,  label: 'Evolution!' },
    ];

    let newCoins = 0;
    for (const a of awards) {
      if (!this.data.achievements[a.key] && a.condition()) {
        this.data.achievements[a.key] = true;
        newCoins += a.reward;
      }
    }
    // Base run coins (1 per 3 kills + 1 per level)
    newCoins += Math.floor(kills / 3) + level;
    this.data.coins += newCoins;
    this.save();
  }

  getAchievements(): Record<string, boolean> { return this.data.achievements; }
  getTotalKills(): number { return this.data.totalKills; }
  getTotalRuns(): number { return this.data.totalRuns; }
  getBestLevel(): number { return this.data.bestLevel; }
}
