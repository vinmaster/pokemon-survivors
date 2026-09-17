// ============================================================
// src/systems/AchievementSystem.ts — kill milestones during a run
// ============================================================
import { Player } from '../entities/Player';
import { MetaSystem } from './MetaSystem';

interface AchievementDef {
  key: string;
  target: number;
  reward: number;
  label: string;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'kills10',  target: 10,  reward: 15, label: 'Kill 10 enemies' },
  { key: 'kills50',  target: 50,  reward: 40, label: 'Kill 50 enemies' },
  { key: 'kills100', target: 100, reward: 90, label: 'Kill 100 enemies' },
];

export class AchievementSystem {
  private player: Player;
  private meta: MetaSystem;

  onUnlock?: (label: string, reward: number) => void;

  constructor(player: Player, meta: MetaSystem) {
    this.player = player;
    this.meta = meta;
  }

  check(): void {
    for (const a of ACHIEVEMENTS) {
      if (this.meta.isAchievementUnlocked(a.key)) continue;
      if (this.player.killCount >= a.target) {
        if (this.meta.unlockAchievement(a.key, a.reward)) {
          if (this.onUnlock) this.onUnlock(a.label, a.reward);
        }
      }
    }
  }
}