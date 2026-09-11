// ============================================================
// src/utils/SpriteGenerator.ts
// Generates placeholder colored sprite sheets when actual assets are missing.
// Also creates textures for XP orbs, projectiles, and UI elements.
// ============================================================

export interface GeneratedSheet {
  key: string;
  canvas: HTMLCanvasElement;
  frameWidth: number;
  frameHeight: number;
}

/** Creates a simple solid-color 4x4 spritesheet with slight per-frame variation */
export function generatePlaceholderSheet(
  key: string,
  color: number,
  frameSize: number = 32
): GeneratedSheet {
  const cols = 4;
  const rows = 4;
  const canvas = document.createElement('canvas');
  canvas.width = frameSize * cols;
  canvas.height = frameSize * rows;
  const ctx = canvas.getContext('2d')!;

  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * frameSize;
      const y = row * frameSize;
      const alpha = 0.85 + (col % 2) * 0.15;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      // Draw body ellipse
      ctx.beginPath();
      ctx.ellipse(
        x + frameSize / 2,
        y + frameSize * 0.6,
        frameSize * 0.38,
        frameSize * 0.42,
        0, 0, Math.PI * 2
      );
      ctx.fill();
      // Draw head circle
      ctx.beginPath();
      ctx.arc(
        x + frameSize / 2,
        y + frameSize * 0.28,
        frameSize * 0.22,
        0, Math.PI * 2
      );
      ctx.fill();
      // Animated offset: leg bob
      const legOffset = (col % 2 === 0) ? 2 : -2;
      ctx.fillStyle = `rgba(${Math.max(0,r-40)},${Math.max(0,g-40)},${Math.max(0,b-40)},${alpha})`;
      ctx.fillRect(x + frameSize*0.25, y + frameSize*0.72 + legOffset, 6, 10);
      ctx.fillRect(x + frameSize*0.55, y + frameSize*0.72 - legOffset, 6, 10);
      // Eyes
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x + frameSize*0.42, y + frameSize*0.24, 3, 0, Math.PI*2);
      ctx.arc(x + frameSize*0.58, y + frameSize*0.24, 3, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(x + frameSize*0.43, y + frameSize*0.25, 1.5, 0, Math.PI*2);
      ctx.arc(x + frameSize*0.59, y + frameSize*0.25, 1.5, 0, Math.PI*2);
      ctx.fill();
    }
  }

  return { key, canvas, frameWidth: frameSize, frameHeight: frameSize };
}

/** Generate a circular orb texture for XP drops */
export function generateOrbTexture(color: string, size: number = 12): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size/2 - 2, size/2 - 2, 1, size/2, size/2, size/2);
  grad.addColorStop(0, 'white');
  grad.addColorStop(0.4, color);
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

/** Generate a grass tile texture */
export function generateGrassTile(size: number = 64): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Base color
  ctx.fillStyle = '#1a3a1a';
  ctx.fillRect(0, 0, size, size);
  // Grass details
  const colors = ['#1e421e', '#164016', '#234023', '#1c3c1c'];
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(
      Math.floor(Math.random() * size),
      Math.floor(Math.random() * size),
      Math.floor(2 + Math.random() * 6),
      Math.floor(2 + Math.random() * 4)
    );
  }
  return canvas;
}

/** Generate a particle circle for effects */
export function generateParticle(color: string, size: number = 8): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
  ctx.fill();
  return canvas;
}
