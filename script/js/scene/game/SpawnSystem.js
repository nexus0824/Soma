import { ENEMIES, pickWeighted } from '../../data/Enemies.js';
import { spawnTableFor } from '../../data/Dungeons.js';
import { BALANCE } from '../../data/Balance.js';
import { getRoomType } from '../../core/RoomTypes.js';
import { roomRandomTile, tileToWorld } from '../../core/Dungeon.js';
import Enemy from '../../core/Enemy.js';
import * as FX from '../../core/FX.js';
import { t } from '../../i18n/I18n.js';

export default class SpawnSystem {
  constructor(scene) {
    this.scene = scene;
  }

  bossEnrageParams() {
    return { ...BALANCE.bossEnrage, ...(this.scene.dungeonDef.bossEnrage || {}) };
  }

  enemyScale() {
    const scene = this.scene;
    const lvl = scene.level;
    const def = scene.dungeonDef;
    const per = def.perFloor || 0.15;
    const growth = 1 + per * (lvl - 1);
    return {
      level: lvl,
      hp: (1 + (def.enemyScale && def.enemyScale.hp !== undefined ? def.enemyScale.hp : BALANCE.enemyHpPerLevel) * (lvl - 1)) * scene.mods.enemyHpMul,
      atk: (1 + BALANCE.enemyAtkPerLevel * (lvl - 1)) * scene.mods.enemyAtkMul,
      xp: growth * scene.mods.xpMul,
      gold: 1 + BALANCE.enemyGoldPerLevel * (lvl - 1),
      speed: scene.mods.enemySpeedMul,
      breakMax: scene.mods.breakMaxMul,
    };
  }

  spawnRoomFeatures() {
    const scene = this.scene;
    for (const room of scene.dungeon.rooms) {
      const handler = getRoomType(room.type);
      if (handler.spawn) handler.spawn(scene, room);
    }
  }

  remainingInRoom(room) {
    let n = 0;
    for (const e of this.scene.enemies.getChildren()) if (e.active && e.room === room) n++;
    return n;
  }

  spawnPack(room, cells, size, opts = {}) {
    const scene = this.scene;
    const table = spawnTableFor(scene.dungeonDef, scene.floor);
    let placed = 0;
    for (let i = 0; i < size; i++) {
      const cell = cells[i % cells.length];
      const w = tileToWorld(cell.tx, cell.ty);
      const e = this.addEnemy(pickWeighted(table, scene.spawnRng), w.x, w.y, true, opts);
      if (e) {
        e.room = room;
        placed++;
      }
    }
    return placed;
  }

  spawnMimic(chest) {
    const scene = this.scene;
    const room = chest.room;
    scene.dungeon.grid[room.cy][room.cx] = 1;
    const x = chest.baseX;
    const y = chest.y;
    chest.destroy();
    const e = this.addEnemy('mimic', x, y, false);
    if (e) {
      e.room = room;
      e.aggro = true;
    }
    scene.events.emit('log', t('game.mimic'), '#ff8ab0');
    scene.cameras.main.shake(200, 0.006);
    return e;
  }

  spawnEnemies() {
    const scene = this.scene;
    const { rooms, spawnRoom, exitRoom } = scene.dungeon;
    this.spawnRoomFeatures();
    const candidates = rooms.filter((r) => getRoomType(r.type).allowsPacks && r !== spawnRoom && (!scene.isBossFloor || r !== exitRoom));
    let count = Math.min(BALANCE.enemyCountMax, BALANCE.enemyCountBase + scene.floor * BALANCE.enemyCountPerFloor);
    if (scene.isBossFloor) count = Math.floor(count * BALANCE.bossFloorCountMul);
    count = Math.round(count * scene.mods.enemyCountMul);
    const spawn = tileToWorld(spawnRoom.cx, spawnRoom.cy);
    let placed = 0;
    let attempts = 0;
    while (placed < count && candidates.length && attempts < count * 10) {
      attempts++;
      const room = scene.spawnRng.pick(candidates);
      const anchorTile = roomRandomTile(room, scene.spawnRng);
      const anchor = tileToWorld(anchorTile.x, anchorTile.y);
      if (Phaser.Math.Distance.Between(anchor.x, anchor.y, spawn.x, spawn.y) < 300) continue;
      const packSize = Math.min(count - placed, scene.spawnRng.between(BALANCE.packMin, BALANCE.packMax));
      const cells = scene.packCells(anchorTile.x, anchorTile.y, 2);
      placed += this.spawnPack(room, cells, packSize);
    }
    if (scene.isBossFloor) {
      const c = tileToWorld(exitRoom.cx, exitRoom.cy - 1);
      scene.boss = this.addEnemy(scene.dungeonDef.boss, c.x, c.y, false);
    }
  }

  addEnemy(typeId, x, y, jitter = true, opts = {}) {
    const scene = this.scene;
    const def = ENEMIES[typeId];
    const spot = scene.nav.nearestClearWorld(x, y, def.bodyRadius * def.scale);
    if (!spot) return null;
    const e = new Enemy(scene, spot.x, spot.y, typeId, { ...this.enemyScale(), elite: !!opts.elite });
    scene.enemies.add(e);
    if (e.def.boss) e.body.setImmovable(true);
    scene.placeActorAt(e, spot.x, spot.y, jitter);
    return e;
  }

  summonMinions(source, n, typeId = 'goblin', cap = 16) {
    const scene = this.scene;
    if (scene.enemies.countActive(true) >= cap) return;
    const origin = scene.nav.toTile(source.body.center.x, source.body.center.y);
    const cells = scene.packCells(origin.tx, origin.ty, 2).filter((c) => c.d >= 1);
    for (let i = 0; i < n; i++) {
      const cell = cells.length ? cells[i % cells.length] : origin;
      const w = tileToWorld(cell.tx, cell.ty);
      const e = this.addEnemy(typeId, w.x, w.y);
      if (!e) continue;
      e.aggro = true;
      FX.burst(scene, e.x, e.y, 0xff8ab0, 8, 30);
    }
  }

  remaining() {
    return this.scene.enemies.countActive(true);
  }

  alertPack(source) {
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active || e.aggro || e === source) continue;
      if (Phaser.Math.Distance.Between(source.x, source.y, e.x, e.y) <= BALANCE.packAlertRange) e.aggro = true;
    }
  }
}
