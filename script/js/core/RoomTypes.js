import { ROOM_PROPS } from '../data/Rooms.js';
import { BALANCE } from '../data/Balance.js';
import { tileToWorld } from './Dungeon.js';
import Chest from './Chest.js';
import Spring from './Spring.js';

const ROOM_TYPES = {};

export function registerRoomType(id, handler = {}) {
  ROOM_TYPES[id] = { allowsPacks: false, props: ROOM_PROPS[id] || ROOM_PROPS.normal, ...handler };
}

export function getRoomType(id) {
  return ROOM_TYPES[id] || ROOM_TYPES.normal;
}

registerRoomType('normal', { allowsPacks: true });
registerRoomType('spawn');
registerRoomType('exit');

registerRoomType('treasure', {
  spawn(scene, room) {
    const c = tileToWorld(room.cx, room.cy);
    const chest = new Chest(scene, c.x, c.y, room, { mimic: !!room.mimic });
    scene.addInteractable(chest, true);
    scene.dungeon.grid[room.cy][room.cx] = 0;
    const cells = scene.packCells(room.cx, room.cy, 2).filter((cell) => cell.d > 0);
    const size = scene.spawnRng.between(BALANCE.packMin, BALANCE.packMax);
    scene.spawnPack(room, cells, size);
  },
});

registerRoomType('spring', {
  spawn(scene, room) {
    const c = tileToWorld(room.cx, room.cy);
    scene.addInteractable(new Spring(scene, c.x, c.y, room), false);
  },
});

registerRoomType('elite', {
  spawn(scene, room) {
    const cells = scene.packCells(room.cx, room.cy, 2);
    const size = scene.spawnRng.between(BALANCE.packMin, BALANCE.packMax);
    scene.spawnPack(room, cells, size, { elite: true });
  },
});
