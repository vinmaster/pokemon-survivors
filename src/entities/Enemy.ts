// ============================================================
// src/entities/Enemy.ts — Enemy runtime state wrapper
// ============================================================
import Phaser from 'phaser';
import { EnemyDef } from '../data/enemies';

export interface EnemyState {
  id: number;           // unique instance id
  def: EnemyDef;
  hp: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  knockbackX: number;
  knockbackY: number;
  knockbackTime: number;
}

let nextId = 0;
export function createEnemy(def: EnemyDef, x: number, y: number): EnemyState {
  return {
    id: nextId++,
    def,
    hp: def.hp,
    x, y,
    vx: 0, vy: 0,
    alive: true,
    knockbackX: 0,
    knockbackY: 0,
    knockbackTime: 0,
  };
}
