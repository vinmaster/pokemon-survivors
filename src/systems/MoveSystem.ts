// ============================================================
// src/systems/MoveSystem.ts — Q/W/E/R key binding & auto-cast
// ============================================================
import Phaser from 'phaser';
import { MoveBase } from '../moves/MoveBase';
import type { MoveKey } from '../data/moves';
import { Player } from '../entities/Player';
import { EnemyState } from '../entities/Enemy';

export type { MoveKey };
export const MOVE_KEYS: MoveKey[] = ['Q', 'W', 'E', 'R'];

export class MoveSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private slots: Map<MoveKey, MoveBase> = new Map();
  private keys: Record<MoveKey, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    const kb = scene.input.keyboard!;
    this.keys = {
      Q: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      E: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      R: kb.addKey(Phaser.Input.Keyboard.KeyCodes.R),
    };
  }

  assignMove(key: MoveKey, move: MoveBase): void {
    const existing = this.slots.get(key);
    if (existing) existing.destroy();
    this.slots.set(key, move);
  }

  removeSlot(key: MoveKey): void {
    const existing = this.slots.get(key);
    if (existing) existing.destroy();
    this.slots.delete(key);
  }

  getSlot(key: MoveKey): MoveBase | undefined {
    return this.slots.get(key);
  }

  getAllSlots(): Map<MoveKey, MoveBase> {
    return this.slots;
  }

  getFilledSlotCount(): number {
    return this.slots.size;
  }

  getFreeKey(): MoveKey | null {
    for (const k of MOVE_KEYS) {
      if (!this.slots.has(k)) return k;
    }
    return null;
  }

  update(delta: number, enemies: EnemyState[]): void {
    for (const [key, move] of this.slots) {
      // Handle key press for manual/toggle moves
      if (Phaser.Input.Keyboard.JustDown(this.keys[key])) {
        move.onPress(enemies);
      }
      move.update(delta, enemies);
    }
  }

  getCooldownInfo(): { key: MoveKey; move: MoveBase }[] {
    return Array.from(this.slots.entries()).map(([k, m]) => ({ key: k, move: m }));
  }
}
