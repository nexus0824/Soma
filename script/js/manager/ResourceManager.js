import { TILE } from '../Define.js';
import { FLOOR_FRAMES } from '../core/Dungeon.js';
import { AUTOTILE_COLS, AUTOTILE_CELLS } from '../data/Autotile.js';

export default class ResourceManager {
  static buildAll(scene) {
    this.buildFloorTiles(scene);
    this.buildWallTiles(scene);
    this.buildAnims(scene);
    this.buildShapes(scene);
  }

  static buildFloorTiles(scene) {
    const tex = scene.textures.get('dungeon');
    const src = tex.getSourceImage();
    const canvas = scene.textures.createCanvas('floortiles', TILE * FLOOR_FRAMES.length, TILE);
    const ctx = canvas.context;
    ctx.imageSmoothingEnabled = false;
    FLOOR_FRAMES.forEach((name, i) => {
      const f = tex.get(name);
      ctx.drawImage(src, f.cutX, f.cutY, f.cutWidth, f.cutHeight, i * TILE, 0, TILE, TILE);
    });
    canvas.refresh();
  }

  static buildWallTiles(scene) {
    const src = scene.textures.get('atlas_walls').getSourceImage();
    const srcCell = src.width / AUTOTILE_COLS;
    const canvas = scene.textures.createCanvas('walltiles', TILE * AUTOTILE_CELLS, TILE);
    const ctx = canvas.context;
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < AUTOTILE_CELLS; i++) {
      const sx = (i % AUTOTILE_COLS) * srcCell;
      const sy = Math.floor(i / AUTOTILE_COLS) * srcCell;
      ctx.drawImage(src, sx, sy, srcCell, srcCell, i * TILE, 0, TILE, TILE);
    }
    canvas.refresh();
  }

  static buildAnims(scene) {
    const names = scene.textures.get('dungeon').getFrameNames();
    const groups = {};
    for (const n of names) {
      const m = n.match(/^(.*)_anim_f(\d+)$/);
      if (!m) continue;
      (groups[m[1]] ||= []).push({ n, i: Number(m[2]) });
    }
    for (const [key, list] of Object.entries(groups)) {
      if (scene.anims.exists(key)) continue;
      list.sort((a, b) => a.i - b.i);
      const isHit = key.endsWith('_hit');
      scene.anims.create({
        key,
        frames: list.map((f) => ({ key: 'dungeon', frame: f.n })),
        frameRate: isHit ? 1 : 8,
        repeat: isHit ? 0 : -1,
      });
    }
  }

  static buildShapes(scene) {
    const make = (key, w, h, draw) => {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    make('particle', 8, 8, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
    });
    make('glow', 48, 24, (g) => {
      g.fillStyle(0xffffff, 0.35);
      g.fillEllipse(24, 12, 48, 24);
      g.fillStyle(0xffffff, 0.5);
      g.fillEllipse(24, 12, 30, 14);
    });
    make('shadow', 36, 14, (g) => {
      g.fillStyle(0x000000, 0.5);
      g.fillEllipse(18, 7, 36, 14);
    });
    make('slash', 96, 96, (g) => {
      g.lineStyle(9, 0xffffff, 0.95);
      g.beginPath();
      g.arc(48, 48, 38, -0.95, 0.95, false);
      g.strokePath();
      g.lineStyle(3, 0xffffff, 0.5);
      g.beginPath();
      g.arc(48, 48, 28, -0.7, 0.7, false);
      g.strokePath();
    });
    make('proj_bolt', 16, 16, (g) => {
      g.fillStyle(0x9fd8ff, 0.5);
      g.fillCircle(8, 8, 8);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 4);
    });
    make('proj_pierce', 26, 12, (g) => {
      g.fillStyle(0xffe36a, 0.6);
      g.fillEllipse(13, 6, 26, 12);
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(15, 6, 16, 5);
    });
    make('proj_wave', 34, 34, (g) => {
      g.lineStyle(6, 0xffffff, 0.95);
      g.beginPath();
      g.arc(14, 17, 13, -1.15, 1.15, false);
      g.strokePath();
    });
    make('proj_enemy', 14, 14, (g) => {
      g.fillStyle(0xff5cd6, 0.55);
      g.fillCircle(7, 7, 7);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(7, 7, 3);
    });
    make('joy_base', 120, 120, (g) => {
      g.fillStyle(0xffffff, 0.12);
      g.fillCircle(60, 60, 58);
      g.lineStyle(2, 0xffffff, 0.35);
      g.strokeCircle(60, 60, 58);
    });
    make('joy_thumb', 56, 56, (g) => {
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(28, 28, 26);
    });
    make('btn_big', 96, 96, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(48, 48, 46);
    });
    make('btn', 68, 68, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(34, 34, 32);
    });
    make('btn_small', 52, 52, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(26, 26, 24);
    });
    const px = (g, color, cells) => {
      g.fillStyle(color, 1);
      for (const [x, y, w, h] of cells) g.fillRect(x, y, w, h);
    };
    make('icon_head', 16, 16, (g) => {
      px(g, 0x8a94a8, [[4, 3, 8, 2], [3, 5, 10, 5], [3, 10, 2, 3], [11, 10, 2, 3]]);
      px(g, 0x2b3142, [[5, 8, 6, 2]]);
      px(g, 0xd0d6e4, [[5, 4, 2, 1]]);
    });
    make('icon_cloak', 16, 16, (g) => {
      px(g, 0x7b3fa0, [[6, 2, 4, 2], [5, 4, 6, 3], [4, 7, 8, 3], [3, 10, 10, 4]]);
      px(g, 0xa66bd0, [[6, 4, 1, 8]]);
      px(g, 0xffd23f, [[7, 2, 2, 1]]);
    });
    make('icon_chest', 16, 16, (g) => {
      px(g, 0x8a5a2b, [[4, 3, 8, 2], [2, 5, 12, 3], [4, 8, 8, 5]]);
      px(g, 0xb87b3f, [[5, 5, 6, 1], [7, 8, 2, 5]]);
      px(g, 0x5a3a1b, [[2, 5, 2, 3], [12, 5, 2, 3]]);
    });
    make('icon_legs', 16, 16, (g) => {
      px(g, 0x3f5a8a, [[4, 3, 8, 3], [4, 6, 3, 8], [9, 6, 3, 8]]);
      px(g, 0x5b7bb5, [[5, 3, 6, 1]]);
      px(g, 0x2b3142, [[4, 13, 3, 1], [9, 13, 3, 1]]);
    });
    make('icon_boots', 16, 16, (g) => {
      px(g, 0x6b4a2b, [[5, 3, 4, 6], [5, 9, 8, 4]]);
      px(g, 0x9a6b3f, [[6, 3, 2, 5]]);
      px(g, 0x2b3142, [[5, 12, 8, 1]]);
    });
    make('icon_gloves', 16, 16, (g) => {
      px(g, 0x8a6b3f, [[5, 5, 6, 8], [3, 7, 2, 4], [11, 4, 2, 5]]);
      px(g, 0xb8935a, [[6, 5, 4, 1]]);
      px(g, 0x5a3a1b, [[5, 12, 6, 1]]);
    });
    make('icon_ring', 16, 16, (g) => {
      px(g, 0xffd23f, [[5, 5, 6, 1], [4, 6, 1, 5], [11, 6, 1, 5], [5, 11, 6, 1]]);
      px(g, 0xfff3b0, [[5, 6, 1, 1]]);
      px(g, 0xff5c8a, [[7, 3, 2, 2]]);
    });
    make('icon_necklace', 16, 16, (g) => {
      px(g, 0xd0d6e4, [[4, 3, 1, 1], [11, 3, 1, 1], [3, 4, 1, 3], [12, 4, 1, 3], [4, 7, 1, 2], [11, 7, 1, 2], [5, 9, 2, 1], [9, 9, 2, 1]]);
      px(g, 0x5ea9ff, [[7, 9, 2, 4]]);
      px(g, 0xbfe3ff, [[7, 9, 1, 1]]);
    });
    make('pixel', 2, 2, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 2, 2);
    });
  }
}
