// ============================================================
// src/data/moves.ts — Move definitions
// ============================================================

export type MoveKey = 'Q' | 'W' | 'E' | 'R';
export type CastMode = 'manual' | 'auto' | 'toggle';

export interface MoveData {
  id: string;
  name: string;
  description: string;
  basePower: number;
  cooldown: number;       // ms
  castMode: CastMode;
  projectileCount?: number;
  range?: number;         // pixels
  aoeRadius?: number;     // pixels
  piercing?: boolean;
  knockback?: number;
  color: number;          // projectile tint
}

export const MOVES: Record<string, MoveData> = {
  vineWhip: {
    id: 'vineWhip',
    name: 'Vine Whip',
    description: 'Lashes a vine in a frontal cone.',
    basePower: 35,
    cooldown: 700,
    castMode: 'manual',
    range: 90,
    aoeRadius: 60,
    color: 0x78c850,
  },
  razorLeaf: {
    id: 'razorLeaf',
    name: 'Razor Leaf',
    description: 'Fires sharp leaves in all directions.',
    basePower: 55,
    cooldown: 1200,
    castMode: 'manual',
    projectileCount: 8,
    range: 200,
    color: 0x48d048,
  },
  ember: {
    id: 'ember',
    name: 'Ember',
    description: 'Shoots a small flame at the nearest enemy.',
    basePower: 40,
    cooldown: 500,
    castMode: 'auto',
    projectileCount: 1,
    range: 250,
    color: 0xff6820,
  },
  flamethrower: {
    id: 'flamethrower',
    name: 'Flamethrower',
    description: 'Continuous piercing beam toward closest foe.',
    basePower: 15,   // per tick (ticks every 100ms)
    cooldown: 3000,
    castMode: 'toggle',
    range: 300,
    piercing: true,
    color: 0xff4400,
  },
  waterGun: {
    id: 'waterGun',
    name: 'Water Gun',
    description: 'Fires a burst of water at an enemy.',
    basePower: 40,
    cooldown: 600,
    castMode: 'manual',
    projectileCount: 1,
    range: 220,
    knockback: 120,
    color: 0x40a0ff,
  },
  hydroPump: {
    id: 'hydroPump',
    name: 'Hydro Pump',
    description: 'High-knockback water blast at enemy clusters.',
    basePower: 110,
    cooldown: 2500,
    castMode: 'manual',
    projectileCount: 1,
    range: 350,
    knockback: 300,
    color: 0x0080ff,
  },
  swift: {
    id: 'swift',
    name: 'Swift',
    description: 'Homing star projectiles seek random enemies.',
    basePower: 60,
    cooldown: 1500,
    castMode: 'auto',
    projectileCount: 3,
    range: 600,
    color: 0xffff40,
  },
  rockSlide: {
    id: 'rockSlide',
    name: 'Rock Slide',
    description: 'AoE boulders drop on the densest enemy cluster.',
    basePower: 75,
    cooldown: 3000,
    castMode: 'auto',
    projectileCount: 3,
    aoeRadius: 70,
    color: 0x909080,
  },
  bubble: {
    id: 'bubble',
    name: 'Bubble',
    description: 'Fires bubbles that slow enemies on hit.',
    basePower: 30,
    cooldown: 800,
    castMode: 'auto',
    projectileCount: 2,
    range: 180,
    color: 0x80c0ff,
  },
  tackle: {
    id: 'tackle',
    name: 'Tackle',
    description: 'Lunges forward damaging all enemies in path.',
    basePower: 40,
    cooldown: 1000,
    castMode: 'manual',
    range: 100,
    piercing: true,
    color: 0xffffff,
  },
};

// Moves available in level-up draft pool (all except starter exclusives)
export const DRAFT_MOVE_POOL = [
  'razorLeaf', 'flamethrower', 'hydroPump', 'swift', 'rockSlide',
];
