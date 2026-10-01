import { TILE, MAP_COLS, MAP_ROWS, DEPTH } from '../../Define.js';
import { getRoomType } from '../../core/RoomTypes.js';
import { generateDungeon, buildTileIndices, tileToWorld } from '../../core/Dungeon.js';
import Navigation from '../../ai/Navigation.js';
import { floorRng } from '../../core/Rng.js';

export default class WorldSystem {
  constructor(scene) {
    this.scene = scene;
    this.explored = new Uint8Array(MAP_COLS * MAP_ROWS);
    this.interactables = [];
    this.blockers = null;
    this.dungeon = null;
    this.nav = null;
    this.map = null;
    this.floorLayer = null;
    this.layer = null;
    this.portal = null;
    this.portalGlow = null;
    this.mapRng = null;
    this.spawnRng = null;
  }

  buildMap() {
    const scene = this.scene;
    const gen = { ...scene.dungeonDef.gen };
    gen.roomCount = (gen.roomCount || 8) + Math.min(3, Math.floor(scene.floor / 4));
    gen.floor = scene.floor;
    this.mapRng = floorRng(scene.run.seed, scene.floor, 'map');
    this.spawnRng = floorRng(scene.run.seed, scene.floor, 'spawn');
    gen.roomRng = floorRng(scene.run.seed, scene.floor, 'rooms');
    gen.roomPlan = scene.dungeonDef.roomPlan;
    this.dungeon = generateDungeon(MAP_COLS, MAP_ROWS, gen, this.mapRng);
    this.nav = new Navigation(this.dungeon.grid);
    this.decorateRooms();
    const map = scene.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: MAP_COLS, height: MAP_ROWS });
    const floorSet = map.addTilesetImage('floortiles', 'floortiles', TILE, TILE, 0, 0, 0);
    const wallSet = map.addTilesetImage('walltiles', 'walltiles', TILE, TILE, 0, 0, floorSet.total);
    const sets = [floorSet, wallSet];
    this.floorLayer = map.createBlankLayer('floor', sets).setDepth(DEPTH.FLOOR);
    this.layer = map.createBlankLayer('walls', sets).setDepth(DEPTH.FLOOR + 0.5);
    const { floor, walls } = buildTileIndices(this.dungeon.grid, undefined, this.mapRng);
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        if (floor[y][x] >= 0) this.floorLayer.putTileAt(floorSet.firstgid + floor[y][x], x, y);
        if (walls[y][x] >= 0) this.layer.putTileAt(wallSet.firstgid + walls[y][x], x, y);
      }
    }
    this.floorLayer.setTint(scene.dungeonDef.tint);
    this.layer.setTint(scene.dungeonDef.tint);
    this.layer.setCollisionByExclusion([-1]);
    scene.physics.world.setBounds(0, 0, MAP_COLS * TILE, MAP_ROWS * TILE);
    this.map = map;
  }

  createBlockers() {
    this.blockers = this.scene.physics.add.staticGroup();
    return this.blockers;
  }

  buildPortal() {
    const scene = this.scene;
    const c = tileToWorld(this.dungeon.exitRoom.cx, this.dungeon.exitRoom.cy);
    this.portal = scene.physics.add.staticImage(c.x, c.y, 'dungeon', 'floor_stairs').setScale(3).setDepth(DEPTH.DECAL).setTint(0x555555);
    this.portal.refreshBody();
    this.portalGlow = scene.add.image(c.x, c.y + 4, 'glow').setDepth(DEPTH.DECAL).setTint(0x8be3ff).setScale(1.6).setVisible(false);
  }

  isFloorAt(x, y) {
    const { tx, ty } = this.nav.toTile(x, y);
    return this.nav.isFloor(tx, ty);
  }

  decorateRooms() {
    const scene = this.scene;
    for (const room of this.dungeon.rooms) {
      const props = getRoomType(room.type).props;
      const n = this.spawnRng.between(props.count[0], props.count[1]);
      for (let i = 0; i < n && props.frames.length; i++) {
        const tx = this.spawnRng.between(room.x, room.x + room.w - 1);
        const ty = this.spawnRng.between(room.y, room.y + room.h - 1);
        if (Math.abs(tx - room.cx) <= 1 && Math.abs(ty - room.cy) <= 1) continue;
        const w = tileToWorld(tx, ty);
        scene.add.image(w.x + this.spawnRng.between(-8, 8), w.y + this.spawnRng.between(-6, 6), 'dungeon', this.spawnRng.pick(props.frames)).setScale(3).setDepth(DEPTH.DECAL).setAlpha(0.9);
      }
    }
  }

  packCells(tx, ty, ring) {
    const cells = [];
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (!this.nav.isClear(tx + dx, ty + dy, false)) continue;
        cells.push({ tx: tx + dx, ty: ty + dy, d: Math.max(Math.abs(dx), Math.abs(dy)) });
      }
    }
    this.spawnRng.shuffle(cells);
    cells.sort((a, b) => a.d - b.d);
    return cells.length ? cells : [{ tx, ty, d: 0 }];
  }

  placeActorAt(actor, x, y, jitter = false) {
    const spot = this.nav.nearestClearWorld(x, y, actor.radius) || { x, y };
    let px = spot.x;
    let py = spot.y;
    if (jitter) {
      const room = Math.max(0, TILE / 2 - actor.radius - 3);
      px += this.spawnRng.floatBetween(-room, room);
      py += this.spawnRng.floatBetween(-room, room);
    }
    const b = actor.body;
    const dx = actor.scaleX * (b.offset.x - actor.displayOriginX) + b.width / 2;
    const dy = actor.scaleY * (b.offset.y - actor.displayOriginY) + b.height / 2;
    actor.setPosition(px - dx, py - dy);
    b.reset(actor.x, actor.y);
    b.updateFromGameObject();
    return actor;
  }

  findInteractable(actor) {
    if (!actor || actor.dead) return null;
    for (const it of this.interactables) if (it.active && it.canInteract(actor)) return it;
    return null;
  }

  addInteractable(obj, solid = false) {
    this.interactables.push(obj);
    if (solid) this.blockers.add(obj);
    return obj;
  }

  removeInteractable(obj) {
    const i = this.interactables.indexOf(obj);
    if (i >= 0) this.interactables.splice(i, 1);
  }
}
