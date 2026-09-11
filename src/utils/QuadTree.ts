// ============================================================
// src/utils/QuadTree.ts — Simple QuadTree for spatial queries
// ============================================================

export interface QTItem {
  x: number;
  y: number;
  id: number;
}

interface QTBounds {
  x: number; y: number; w: number; h: number;
}

const MAX_OBJECTS = 12;
const MAX_DEPTH = 6;

export class QuadTree {
  private bounds: QTBounds;
  private depth: number;
  private items: QTItem[] = [];
  private children: QuadTree[] | null = null;

  constructor(bounds: QTBounds, depth = 0) {
    this.bounds = bounds;
    this.depth = depth;
  }

  clear(): void {
    this.items = [];
    if (this.children) {
      for (const child of this.children) child.clear();
      this.children = null;
    }
  }

  insert(item: QTItem): void {
    if (this.children) {
      const idx = this.getIndex(item.x, item.y);
      if (idx !== -1) {
        this.children[idx].insert(item);
        return;
      }
    }
    this.items.push(item);
    if (this.items.length > MAX_OBJECTS && this.depth < MAX_DEPTH) {
      this.subdivide();
      let i = this.items.length - 1;
      while (i >= 0) {
        const it = this.items[i];
        const idx = this.getIndex(it.x, it.y);
        if (idx !== -1) {
          this.children![idx].insert(this.items.splice(i, 1)[0]);
        }
        i--;
      }
    }
  }

  query(x: number, y: number, radius: number, result: QTItem[]): void {
    const { bounds } = this;
    if (
      x + radius < bounds.x || x - radius > bounds.x + bounds.w ||
      y + radius < bounds.y || y - radius > bounds.y + bounds.h
    ) return;

    for (const item of this.items) {
      const dx = item.x - x;
      const dy = item.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        result.push(item);
      }
    }
    if (this.children) {
      for (const child of this.children) child.query(x, y, radius, result);
    }
  }

  /** Find the densest cell center within a search area */
  findDensestPoint(searchX: number, searchY: number, searchR: number, cellSize = 64): { x: number; y: number; count: number } {
    const hits: QTItem[] = [];
    this.query(searchX, searchY, searchR, hits);
    const cells = new Map<string, { x: number; y: number; count: number }>();
    for (const h of hits) {
      const cx = Math.floor(h.x / cellSize) * cellSize + cellSize / 2;
      const cy = Math.floor(h.y / cellSize) * cellSize + cellSize / 2;
      const key = `${cx},${cy}`;
      if (!cells.has(key)) cells.set(key, { x: cx, y: cy, count: 0 });
      cells.get(key)!.count++;
    }
    let best = { x: searchX, y: searchY, count: 0 };
    for (const cell of cells.values()) {
      if (cell.count > best.count) best = cell;
    }
    return best;
  }

  private subdivide(): void {
    const { x, y, w, h } = this.bounds;
    const hw = w / 2, hh = h / 2;
    this.children = [
      new QuadTree({ x: x + hw, y,          w: hw, h: hh }, this.depth + 1),
      new QuadTree({ x,         y,          w: hw, h: hh }, this.depth + 1),
      new QuadTree({ x,         y: y + hh,  w: hw, h: hh }, this.depth + 1),
      new QuadTree({ x: x + hw, y: y + hh,  w: hw, h: hh }, this.depth + 1),
    ];
  }

  private getIndex(px: number, py: number): number {
    if (!this.children) return -1;
    const { x, y, w, h } = this.bounds;
    const mx = x + w / 2, my = y + h / 2;
    const right = px >= mx, bottom = py >= my;
    if (!right && !bottom) return 1;
    if (right && !bottom)  return 0;
    if (!right && bottom)  return 2;
    return 3;
  }
}
