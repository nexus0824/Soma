import { TILE } from '../Define.js';

const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export default class Navigation {
  constructor(grid) {
    this.grid = grid;
    this.rows = grid.length;
    this.cols = grid[0].length;
    this.fields = new Map();
  }

  isFloor(tx, ty) {
    return ty >= 0 && ty < this.rows && tx >= 0 && tx < this.cols && this.grid[ty][tx] === 1;
  }

  toTile(x, y) {
    return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
  }

  toWorld(tx, ty) {
    return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
  }

  canStep(tx, ty, dx, dy) {
    if (!this.isFloor(tx + dx, ty + dy)) return false;
    if (dx !== 0 && dy !== 0) return this.isFloor(tx + dx, ty) && this.isFloor(tx, ty + dy);
    return true;
  }

  fieldTo(x, y) {
    const { tx, ty } = this.toTile(x, y);
    const key = ty * this.cols + tx;
    const cached = this.fields.get(key);
    if (cached) return cached;
    const dist = new Int16Array(this.rows * this.cols).fill(-1);
    if (!this.isFloor(tx, ty)) return { dist, cols: this.cols, key };
    const queue = [key];
    dist[key] = 0;
    for (let head = 0; head < queue.length; head++) {
      const cur = queue[head];
      const cx = cur % this.cols;
      const cy = Math.floor(cur / this.cols);
      for (const [dx, dy] of DIRS) {
        if (!this.canStep(cx, cy, dx, dy)) continue;
        const nk = (cy + dy) * this.cols + cx + dx;
        if (dist[nk] !== -1) continue;
        dist[nk] = dist[cur] + (dx !== 0 && dy !== 0 ? 3 : 2);
        queue.push(nk);
      }
    }
    const field = { dist, cols: this.cols, key };
    if (this.fields.size > 24) this.fields.delete(this.fields.keys().next().value);
    this.fields.set(key, field);
    return field;
  }

  nextStep(field, x, y) {
    const { tx, ty } = this.toTile(x, y);
    const here = field.dist[ty * this.cols + tx];
    if (here <= 0) return null;
    let best = null;
    let bestD = here;
    for (const [dx, dy] of DIRS) {
      if (!this.canStep(tx, ty, dx, dy)) continue;
      const d = field.dist[(ty + dy) * this.cols + tx + dx];
      if (d !== -1 && d < bestD) {
        bestD = d;
        best = [tx + dx, ty + dy];
      }
    }
    return best ? this.toWorld(best[0], best[1]) : null;
  }

  distance(field, x, y) {
    const { tx, ty } = this.toTile(x, y);
    return field.dist[ty * this.cols + tx];
  }

  rayClear(x0, y0, x1, y1) {
    const steps = Math.ceil(Phaser.Math.Distance.Between(x0, y0, x1, y1) / (TILE / 3));
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const { tx, ty } = this.toTile(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      if (!this.isFloor(tx, ty)) return false;
    }
    return true;
  }

  hasLineOfSight(x0, y0, x1, y1, radius = 0) {
    if (!this.rayClear(x0, y0, x1, y1)) return false;
    if (radius <= 0) return true;
    const d = Phaser.Math.Distance.Between(x0, y0, x1, y1);
    if (d < 1) return true;
    const nx = (-(y1 - y0) / d) * radius;
    const ny = ((x1 - x0) / d) * radius;
    return this.rayClear(x0 + nx, y0 + ny, x1 + nx, y1 + ny) && this.rayClear(x0 - nx, y0 - ny, x1 - nx, y1 - ny);
  }

  isClear(tx, ty, needNeighbors) {
    if (!this.isFloor(tx, ty)) return false;
    if (!needNeighbors) return true;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) if (!this.isFloor(tx + dx, ty + dy)) return false;
    }
    return true;
  }

  nearestClearWorld(x, y, radiusPx = 0, maxRing = 4) {
    const need = radiusPx > TILE / 2 - 6;
    const { tx, ty } = this.toTile(x, y);
    if (this.isClear(tx, ty, need)) return this.toWorld(tx, ty);
    for (let r = 1; r <= maxRing; r++) {
      let best = null;
      let bestD = Infinity;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (!this.isClear(tx + dx, ty + dy, need)) continue;
          const w = this.toWorld(tx + dx, ty + dy);
          const d = Phaser.Math.Distance.Between(x, y, w.x, w.y);
          if (d < bestD) {
            bestD = d;
            best = w;
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  nearestFloorWorld(x, y, radiusTiles = 3) {
    return this.nearestClearWorld(x, y, 0, radiusTiles);
  }
}
