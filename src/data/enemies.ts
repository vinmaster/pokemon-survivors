// ============================================================
// src/data/enemies.ts — Enemy wave definitions
// ============================================================

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  xpDrop: number;
  damage: number;       // contact damage per second
  scale: number;        // visual scale factor
  hitboxSize: number;   // square hitbox half-extent in px
  color: number;        // placeholder tint if no sprite
  spriteKey?: string;   // optional sprite sheet key (filename without extension)
  isBoss?: boolean;
}

export const ENEMIES: Record<string, EnemyDef> = {
  rattata: {
    id: 'rattata', name: 'Rattata',
    hp: 30, speed: 70, xpDrop: 2, damage: 6,
    scale: 0.8, hitboxSize: 10, color: 0xa8a878, spriteKey: 'rattata',
  },
  pidgey: {
    id: 'pidgey', name: 'Pidgey',
    hp: 40, speed: 90, xpDrop: 3, damage: 5,
    scale: 0.9, hitboxSize: 10, color: 0xa8a878, spriteKey: 'pidgey',
  },
  zubat: {
    id: 'zubat', name: 'Zubat',
    hp: 40, speed: 100, xpDrop: 3, damage: 7,
    scale: 1.0, hitboxSize: 12, color: 0x7038f8, spriteKey: 'zubat',
  },
  geodude: {
    id: 'geodude', name: 'Geodude',
    hp: 80, speed: 45, xpDrop: 6, damage: 10,
    scale: 1.0, hitboxSize: 14, color: 0xb8a038, spriteKey: 'geodude',
  },
  magikarp: {
    id: 'magikarp', name: 'Magikarp',
    hp: 20, speed: 50, xpDrop: 1, damage: 3,
    scale: 0.7, hitboxSize: 10, color: 0xf08030, spriteKey: 'magikarp',
  },
  gastly: {
    id: 'gastly', name: 'Gastly',
    hp: 50, speed: 85, xpDrop: 5, damage: 8,
    scale: 1.1, hitboxSize: 12, color: 0x705898, spriteKey: 'gastly',
  },
  ekans: {
    id: 'ekans', name: 'Ekans',
    hp: 55, speed: 65, xpDrop: 4, damage: 9,
    scale: 1.0, hitboxSize: 12, color: 0xa040a0, spriteKey: 'ekans',
  },
  snorlax: {
    id: 'snorlax', name: 'Snorlax',
    hp: 800, speed: 30, xpDrop: 80, damage: 25,
    scale: 2.0, hitboxSize: 30, color: 0x68a090, spriteKey: 'snorlax',
    isBoss: true,
  },
  gengar: {
    id: 'gengar', name: 'Gengar',
    hp: 400, speed: 110, xpDrop: 50, damage: 18,
    scale: 1.6, hitboxSize: 22, color: 0x705898, spriteKey: 'gengar',
    isBoss: true,
  },
};

// Wave definitions: each entry spawns at specified time (seconds elapsed)
export interface WaveDef {
  time: number;              // seconds since run start
  enemyId: string;
  count: number;
  spawnInterval: number;    // ms between spawns in this wave
}

export const WAVES: WaveDef[] = [
  // Early game — small critters
  { time: 0,   enemyId: 'rattata', count: 8,  spawnInterval: 400 },
  { time: 15,  enemyId: 'pidgey',  count: 6,  spawnInterval: 500 },
  { time: 30,  enemyId: 'rattata', count: 15, spawnInterval: 200 },
  { time: 45,  enemyId: 'zubat',   count: 10, spawnInterval: 300 },
  { time: 60,  enemyId: 'magikarp',count: 20, spawnInterval: 150 },
  // Mid game
  { time: 90,  enemyId: 'ekans',   count: 12, spawnInterval: 350 },
  { time: 120, enemyId: 'gastly',  count: 10, spawnInterval: 400 },
  { time: 150, enemyId: 'geodude', count: 8,  spawnInterval: 500 },
  // First boss
  { time: 180, enemyId: 'snorlax', count: 1,  spawnInterval: 0 },
  // Late game escalation
  { time: 200, enemyId: 'rattata', count: 30, spawnInterval: 100 },
  { time: 220, enemyId: 'zubat',   count: 25, spawnInterval: 120 },
  { time: 250, enemyId: 'gastly',  count: 20, spawnInterval: 200 },
  { time: 280, enemyId: 'geodude', count: 20, spawnInterval: 200 },
  // Second boss
  { time: 300, enemyId: 'gengar',  count: 1,  spawnInterval: 0 },
  // Endless escalation (repeats every 60s after 300s)
  { time: 360, enemyId: 'rattata', count: 40, spawnInterval: 80 },
  { time: 360, enemyId: 'zubat',   count: 30, spawnInterval: 100 },
  { time: 420, enemyId: 'gengar',  count: 1,  spawnInterval: 0 },
  { time: 420, enemyId: 'gastly',  count: 30, spawnInterval: 150 },
];
