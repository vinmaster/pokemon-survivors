// ============================================================
// src/data/starters.ts — Starter Pokémon definitions
// ============================================================

export interface StarterEvolution {
  id: string;
  name: string;
  level: number; // evolution trigger level
  hpBonus: number;
  atkBonus: number;
  spdBonus: number;
}

export interface StarterData {
  id: string;
  name: string;
  type: 'Grass' | 'Fire' | 'Water';
  description: string;
  color: number;   // tint color for placeholder sprite
  evolutions: StarterEvolution[];
  startMoves: string[];
  baseStats: {
    hp: number;
    attack: number;
    speed: number;
    collectionRadius: number;
  };
}

export const STARTERS: StarterData[] = [
  {
    id: 'bulbasaur',
    name: 'Bulbasaur',
    type: 'Grass',
    description: 'A resilient Grass-type with bulb-powered attacks.',
    color: 0x78c850,
    evolutions: [
      { id: 'bulbasaur',  name: 'Bulbasaur',  level: 1,  hpBonus: 0,  atkBonus: 0,  spdBonus: 0 },
      { id: 'ivysaur',   name: 'Ivysaur',    level: 5,  hpBonus: 25, atkBonus: 10, spdBonus: 5 },
      { id: 'venusaur',  name: 'Venusaur',   level: 10, hpBonus: 60, atkBonus: 30, spdBonus: 10 },
    ],
    startMoves: ['vineWhip'],
    baseStats: { hp: 20, attack: 45, speed: 90, collectionRadius: 80 },
  },
  {
    id: 'charmander',
    name: 'Charmander',
    type: 'Fire',
    description: 'A speedy Fire-type with blazing beam attacks.',
    color: 0xf08030,
    evolutions: [
      { id: 'charmander',  name: 'Charmander',  level: 1,  hpBonus: 0,  atkBonus: 0,  spdBonus: 0 },
      { id: 'charmeleon',  name: 'Charmeleon',  level: 5,  hpBonus: 20, atkBonus: 15, spdBonus: 15 },
      { id: 'charizard',   name: 'Charizard',   level: 10, hpBonus: 50, atkBonus: 40, spdBonus: 25 },
    ],
    startMoves: ['ember'],
    baseStats: { hp: 20, attack: 52, speed: 115, collectionRadius: 70 },
  },
  {
    id: 'squirtle',
    name: 'Squirtle',
    type: 'Water',
    description: 'A tough Water-type with high-pressure cannon blasts.',
    color: 0x6890f0,
    evolutions: [
      { id: 'squirtle',   name: 'Squirtle',   level: 1,  hpBonus: 0,  atkBonus: 0,  spdBonus: 0 },
      { id: 'wartortle',  name: 'Wartortle',  level: 5,  hpBonus: 30, atkBonus: 12, spdBonus: 8 },
      { id: 'blastoise',  name: 'Blastoise',  level: 10, hpBonus: 70, atkBonus: 28, spdBonus: 12 },
    ],
    startMoves: ['waterGun'],
    baseStats: { hp: 20, attack: 48, speed: 85, collectionRadius: 90 },
  },
];
