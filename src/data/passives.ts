// ============================================================
// src/data/passives.ts — Passive item definitions
// ============================================================

export interface PassiveData {
  id: string;
  name: string;
  description: string;
  cost: number;          // PokéCoins to purchase
  icon: string;          // emoji for UI
  maxLevel: number;
  levels: PassiveLevel[];
}

export interface PassiveLevel {
  level: number;
  upgradeCost: number;
  effect: PassiveEffect;
}

export interface PassiveEffect {
  hpRegenPercent?: number;   // HP per 2 seconds (%)
  cooldownReduction?: number; // multiplier (e.g. 0.85 = 15% reduction)
  critChance?: number;        // added crit chance 0-1
  fatalBlock?: boolean;       // prevent one fatal hit
  magnetBonus?: number;       // added collection radius in pixels
  damageBonus?: number;       // flat attack bonus
  speedBonus?: number;        // flat speed bonus
  maxHpBonus?: number;        // flat max HP bonus
}

export const PASSIVES: Record<string, PassiveData> = {
  leftovers: {
    id: 'leftovers',
    name: 'Leftovers',
    description: 'Restores HP over time.',
    cost: 50,
    icon: '🍎',
    maxLevel: 3,
    levels: [
      { level: 1, upgradeCost: 0,   effect: { hpRegenPercent: 1.0 } },
      { level: 2, upgradeCost: 40,  effect: { hpRegenPercent: 2.0 } },
      { level: 3, upgradeCost: 80,  effect: { hpRegenPercent: 3.5 } },
    ],
  },
  quickClaw: {
    id: 'quickClaw',
    name: 'Quick Claw',
    description: 'Reduces all move cooldowns.',
    cost: 75,
    icon: '⚡',
    maxLevel: 3,
    levels: [
      { level: 1, upgradeCost: 0,   effect: { cooldownReduction: 0.85 } },
      { level: 2, upgradeCost: 60,  effect: { cooldownReduction: 0.70 } },
      { level: 3, upgradeCost: 100, effect: { cooldownReduction: 0.55 } },
    ],
  },
  scopeLens: {
    id: 'scopeLens',
    name: 'Scope Lens',
    description: 'Boosts Critical Hit Chance.',
    cost: 80,
    icon: '🔍',
    maxLevel: 3,
    levels: [
      { level: 1, upgradeCost: 0,   effect: { critChance: 0.10 } },
      { level: 2, upgradeCost: 70,  effect: { critChance: 0.20 } },
      { level: 3, upgradeCost: 120, effect: { critChance: 0.35 } },
    ],
  },
  focusBand: {
    id: 'focusBand',
    name: 'Focus Band',
    description: 'Prevents one fatal hit per run.',
    cost: 100,
    icon: '🛡️',
    maxLevel: 1,
    levels: [
      { level: 1, upgradeCost: 0, effect: { fatalBlock: true } },
    ],
  },
  magnet: {
    id: 'magnet',
    name: 'Magnet',
    description: 'Greatly expands XP collection radius.',
    cost: 60,
    icon: '🧲',
    maxLevel: 3,
    levels: [
      { level: 1, upgradeCost: 0,  effect: { magnetBonus: 60 } },
      { level: 2, upgradeCost: 50, effect: { magnetBonus: 130 } },
      { level: 3, upgradeCost: 90, effect: { magnetBonus: 220 } },
    ],
  },
  choiceBand: {
    id: 'choiceBand',
    name: 'Choice Band',
    description: 'Significantly boosts Attack power.',
    cost: 90,
    icon: '💪',
    maxLevel: 3,
    levels: [
      { level: 1, upgradeCost: 0,  effect: { damageBonus: 15 } },
      { level: 2, upgradeCost: 70, effect: { damageBonus: 35 } },
      { level: 3, upgradeCost: 120, effect: { damageBonus: 60 } },
    ],
  },
};

export const ALL_PASSIVES = Object.values(PASSIVES);
export const MAX_EQUIPPED_PASSIVES = 4;
