import { MAP_COLS, MAP_ROWS, TILE } from '../Define.js';
import { LAYOUT } from './Layout.js';

const COLOR_FLOOR = 0x5a6378;
const COLOR_WALL = 0x2b3142;
const COLOR_FOG = 0x0b0d14;

export default class Minimap {
  constructor(ui, gs) {
    this.ui = ui;
    this.gs = gs;
    const M = LAYOUT.minimap;
    this.tile = Math.max(1, Math.floor(Math.min(M.w / MAP_COLS, M.h / MAP_ROWS)));
    this.w = this.tile * MAP_COLS;
    this.h = this.tile * MAP_ROWS;
    this.x = M.x + (M.w - this.w);
    this.y = M.y;
    this.revealRadius = M.reveal;
    this.frame = ui.add.rectangle(this.x + this.w / 2, this.y + this.h / 2, this.w + 6, this.h + 6, 0x000000, 0.55).setStrokeStyle(1, 0xffffff, 0.25);
    this.base = ui.add.graphics();
    this.marks = ui.add.graphics();
    this.dungeon = null;
    this.pulse = 0;
    this.fullyRevealed = false;
  }

  reset() {
    this.dungeon = this.gs.dungeon;
    this.fullyRevealed = false;
    this.base.clear();
    this.base.fillStyle(COLOR_FOG, 0.6);
    this.base.fillRect(this.x, this.y, this.w, this.h);
    const ex = this.gs.explored;
    for (let i = 0; i < ex.length; i++) if (ex[i]) this.paintTile(i % MAP_COLS, Math.floor(i / MAP_COLS));
  }

  paintTile(tx, ty) {
    const nav = this.gs.nav;
    const t = this.tile;
    if (nav.isFloor(tx, ty)) {
      this.base.fillStyle(COLOR_FLOOR, 1);
      this.base.fillRect(this.x + tx * t, this.y + ty * t, t, t);
      return;
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (nav.isFloor(tx + dx, ty + dy)) {
          this.base.fillStyle(COLOR_WALL, 1);
          this.base.fillRect(this.x + tx * t, this.y + ty * t, t, t);
          return;
        }
      }
    }
  }

  revealAround(tx, ty) {
    const ex = this.gs.explored;
    const r = this.revealRadius;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = tx + dx;
        const y = ty + dy;
        if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) continue;
        const idx = y * MAP_COLS + x;
        if (ex[idx]) continue;
        ex[idx] = 1;
        this.paintTile(x, y);
      }
    }
  }

  revealAll() {
    this.fullyRevealed = true;
    const ex = this.gs.explored;
    for (let i = 0; i < ex.length; i++) {
      if (ex[i]) continue;
      ex[i] = 1;
      this.paintTile(i % MAP_COLS, Math.floor(i / MAP_COLS));
    }
  }

  explored(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_COLS || ty >= MAP_ROWS) return false;
    return !!this.gs.explored[ty * MAP_COLS + tx];
  }

  dot(x, y, color, size, alpha = 1) {
    const t = this.tile;
    this.marks.fillStyle(color, alpha);
    this.marks.fillRect(this.x + (x / TILE) * t - size / 2, this.y + (y / TILE) * t - size / 2, size, size);
  }

  update() {
    const gs = this.gs;
    if (!gs.dungeon || !gs.player || !gs.explored) return;
    if (gs.dungeon !== this.dungeon) this.reset();
    if (this.ui.registry.get('revealMap') && !this.fullyRevealed) this.revealAll();
    const p = gs.player;
    this.revealAround(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
    const g = this.marks;
    g.clear();
    this.pulse = (this.pulse + 1) % 60;
    const exit = gs.dungeon.exitRoom;
    const exitX = (exit.cx + 0.5) * TILE;
    const exitY = (exit.cy + 0.5) * TILE;
    if (gs.portalOpen || this.explored(exitX, exitY)) {
      const blink = gs.portalOpen && this.pulse < 30;
      this.dot(exitX, exitY, blink ? 0xffffff : 0x8be3ff, this.tile + 3);
    }
    for (const it of gs.interactables) {
      if (!it.active || !it.minimapColor || it.state === 'used' || !this.explored(it.x, it.y)) continue;
      const blink = it.state === 'active' && it.blinkWhenActive && this.pulse < 30;
      this.dot(it.x, it.y, blink ? 0xffffff : it.minimapColor, this.tile + 2, it.state === 'active' ? 1 : 0.5);
    }
    for (const e of gs.enemies.getChildren()) {
      if (!e.active || !this.explored(e.x, e.y)) continue;
      if (e.def.boss) this.dot(e.x, e.y, 0xff5c8a, this.tile + 2);
      else this.dot(e.x, e.y, 0xff6b6b, this.tile);
    }
    for (const c of gs.companions.getChildren()) {
      if (!c.active) continue;
      this.dot(c.x, c.y, c.cls.color, this.tile + 1, c.downed ? 0.4 : 1);
    }
    this.dot(p.x, p.y, 0xffffff, this.tile + 2);
  }

  destroy() {
    this.frame.destroy();
    this.base.destroy();
    this.marks.destroy();
  }
}
