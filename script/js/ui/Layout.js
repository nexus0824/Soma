import { GAME_WIDTH as W, GAME_HEIGHT as H } from '../Define.js';

export const LAYOUT = {
  hud: { x: 12, y: 12, barW: 210, hpH: 16, mpH: 9, xpH: 4 },
  level: { x: 230, y: 8 },
  floor: { x: 350, y: 18 },
  remain: { x: 350, y: 42 },
  gold: { x: W - 62, y: 24 },
  bag: { x: W - 30, y: 26 },
  boss: { y: 62, w: 380 },
  party: { x: 12, y: 70, w: 226, rowH: 40, hint: 154 },
  mods: { x: 12, y: 168 },
  log: { x: W / 2, y: H - 330 },
  joystick: { x: 100, y: H - 140, radius: 46, zone: { x: 0, y: H * 0.42, w: W * 0.55, h: H * 0.58 } },
  attack: { x: W - 78, y: H - 118, r: 46 },
  dodge: { x: W - 78, y: H - 34, r: 24 },
  skills: [
    { x: W - 192, y: H - 92 },
    { x: W - 182, y: H - 182 },
    { x: W - 96, y: H - 226 },
  ],
  skillR: 32,
  panel: { x: 12, y: 40, w: W - 24, h: H - 80, tabY: 60, contentY: 108, bottomY: H - 66 },
  inventory: { cols: 5, cell: 60, gap: 10, iconScale: 2.5, dollY: 134, bagY: 312, detailY: 606 },
};
