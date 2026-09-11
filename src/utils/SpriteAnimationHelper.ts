// ============================================================
// src/utils/SpriteAnimationHelper.ts
// Handles 8-directional frame mappings, horizontal mirroring,
// and animation registration for PMD-style 4x4 spritesheets.
// ============================================================
import Phaser from 'phaser';

export type Direction8 =
  | 'down'
  | 'down_right'
  | 'right'
  | 'up_right'
  | 'up'
  | 'up_left'
  | 'left'
  | 'down_left';

/**
 * In PMD 4x4 sheets (15 active frames in a 4-col grid):
 * - Frame 0..2:   Down (South) -> [0, 1, 0, 2]
 * - Frame 3..5:   Down-Right (South-East) -> [3, 4, 3, 5]
 * - Frame 6..8:   Right (East) -> [6, 7, 6, 8]
 * - Frame 9..11:  Up-Right (North-East) -> [9, 10, 9, 11]
 * - Frame 12..14: Up (North) -> [12, 13, 12, 14]
 * - Frame 15:     Empty/unused
 *
 * In these sheets the east-facing frames (below) already depict the character
 * facing LEFT, so the right-facing directions (East, South-East, North-East)
 * are produced by mirroring them with a horizontal flip (flipX = true).
 */
export const DIRECTION_CONFIG: Record<
  Direction8,
  { frames: number[]; idleFrame: number; mirror: boolean }
> = {
  down:        { frames: [0, 1, 0, 2],    idleFrame: 0,  mirror: false },
  down_right:  { frames: [3, 4, 3, 5],    idleFrame: 3,  mirror: true },
  right:       { frames: [6, 7, 6, 8],    idleFrame: 6,  mirror: true },
  up_right:    { frames: [9, 10, 9, 11],  idleFrame: 9,  mirror: true },
  up:          { frames: [12, 13, 12, 14],idleFrame: 12, mirror: false },
  up_left:     { frames: [9, 10, 9, 11],  idleFrame: 9,  mirror: false },
  left:        { frames: [6, 7, 6, 8],    idleFrame: 6,  mirror: false },
  down_left:   { frames: [3, 4, 3, 5],    idleFrame: 3,  mirror: false },
};

/**
 * Calculates 8-direction name from a 2D velocity or displacement vector.
 */
export function getDirection8(vx: number, vy: number): Direction8 {
  if (vx === 0 && vy === 0) return 'down';

  // Math.atan2 returns angle in [-PI, PI]:
  // 0 = right, PI/2 = down, PI/-PI = left, -PI/2 = up
  const angle = Math.atan2(vy, vx);
  const octant = Math.round((8 * angle) / (2 * Math.PI) + 8) % 8;

  const directions: Direction8[] = [
    'right',
    'down_right',
    'down',
    'down_left',
    'left',
    'up_left',
    'up',
    'up_right',
  ];

  return directions[octant];
}

/**
 * Returns true if the direction requires horizontal mirroring.
 * The east-facing frames depict the character facing left, so the
 * right-facing directions (East, South-East, North-East) are mirrored.
 */
export function isMirroredDirection(direction: string): boolean {
  return direction.includes('right');
}

/**
 * Registers all 8-directional walk and idle animations for a spritesheet key.
 * Also registers hyphenated aliases (e.g. 'down-right' as well as 'down_right')
 * and standard cardinal fallbacks.
 */
export function registerDirectionalAnimations(
  anims: Phaser.Animations.AnimationManager,
  key: string,
  frameRate: number = 8
): void {
  for (const [dir, config] of Object.entries(DIRECTION_CONFIG) as [Direction8, typeof DIRECTION_CONFIG[Direction8]][]) {
    const animKey = `${key}_walk_${dir}`;
    if (!anims.exists(animKey)) {
      anims.create({
        key: animKey,
        frames: config.frames.map(f => ({ key, frame: f })),
        frameRate,
        repeat: -1,
      });
    }

    // Register hyphenated alias (e.g. 'down-right')
    const hyphenDir = dir.replace('_', '-');
    if (hyphenDir !== dir) {
      const hyphenKey = `${key}_walk_${hyphenDir}`;
      if (!anims.exists(hyphenKey)) {
        anims.create({
          key: hyphenKey,
          frames: config.frames.map(f => ({ key, frame: f })),
          frameRate,
          repeat: -1,
        });
      }
    }

    // Directional idle
    const idleKey = `${key}_idle_${dir}`;
    if (!anims.exists(idleKey)) {
      anims.create({
        key: idleKey,
        frames: [{ key, frame: config.idleFrame }],
        frameRate: 1,
        repeat: 0,
      });
    }

    if (hyphenDir !== dir) {
      const hyphenIdle = `${key}_idle_${hyphenDir}`;
      if (!anims.exists(hyphenIdle)) {
        anims.create({
          key: hyphenIdle,
          frames: [{ key, frame: config.idleFrame }],
          frameRate: 1,
          repeat: 0,
        });
      }
    }
  }

  // Base fallback idle (facing down neutral)
  const defaultIdleKey = `${key}_idle`;
  if (!anims.exists(defaultIdleKey)) {
    anims.create({
      key: defaultIdleKey,
      frames: [{ key, frame: 0 }],
      frameRate: 1,
      repeat: 0,
    });
  }
}
