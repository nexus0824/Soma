import { TILE, MAP_COLS, MAP_ROWS, DEPTH } from '../Define.js';
import { ENEMIES, pickWeighted } from '../data/Enemies.js';
import { t } from '../i18n/I18n.js';
import { CLASSES } from '../data/Classes.js';
import { DUNGEONS, spawnTableFor, difficultyLevel, isBossFloor } from '../data/Dungeons.js';
import { combineModifiers } from '../data/Modifiers.js';
import { BALANCE } from '../data/Balance.js';
import Player from '../core/Player.js';
import Companion, { TACTICS } from '../core/Companion.js';
import Enemy from '../core/Enemy.js';
import Projectile from '../core/Projectile.js';
import { getRoomType } from '../core/RoomTypes.js';
import { generateDungeon, buildTileIndices, roomRandomTile, tileToWorld } from '../core/Dungeon.js';
import Navigation from '../ai/Navigation.js';
import { InputState } from '../core/InputState.js';
import * as FX from '../core/FX.js';
import { applyHits } from '../combat/HitFeedback.js';
import HazardManager from '../combat/Hazards.js';
import { GAME_RNG, floorRng } from '../core/Rng.js';
import EntityRegistry from './game/EntityRegistry.js';
import InputCollector from './game/InputCollector.js';
import { buildHud } from './game/HudBuilder.js';
import RunFlow from './game/RunFlow.js';
import RewardSystem from './game/RewardSystem.js';

export default class SceneGame extends Phaser.Scene {
  constructor() {
    super('SceneGame');
  }

  init(data) {
    this.character = data.character;
    this.run = this.character.run;
    if (!this.run.seed) this.run.seed = GAME_RNG.between(1, 2147483646);
    this.dungeonDef = DUNGEONS[this.run.dungeonId];
    this.floor = this.run.floor;
    this.mods = combineModifiers(this.run.modifiers);
    this.level = difficultyLevel(this.dungeonDef, this.floor);
  }

  create() {
    InputState.reset();
    this.transitioning = false;
    this.boss = null;
    this.portalOpen = false;
    this.hitStopEnd = 0;
    this.combatNow = 0;
    this.fxTweens = new Phaser.Tweens.TweenManager(this);
    this.hazards = new HazardManager(this);
    this.registry_ = new EntityRegistry();
    this.explored = new Uint8Array(MAP_COLS * MAP_ROWS);
    this.rewards = new RewardSystem(this);
    this.flow = new RunFlow(this);
    this.inputs = new InputCollector(this);
    this.fxTweens.start();
    this.isBossFloor = isBossFloor(this.dungeonDef, this.floor, this.run.floors);
    this.character.setBest(this.run.dungeonId, this.floor);
    this.buildMap();

    const spawn = tileToWorld(this.dungeon.spawnRoom.cx, this.dungeon.spawnRoom.cy);
    this.player = new Player(this, spawn.x, spawn.y, this.character);
    this.placeActorAt(this.player, spawn.x, spawn.y);
    this.companions = this.physics.add.group({ collideWorldBounds: true });
    const tactics = this.registry.get('tactics') || {};
    Object.keys(CLASSES).filter((id) => id !== this.player.clsId).forEach((id, i) => {
      const c = new Companion(this, spawn.x, spawn.y, id, i, tactics[id]);
      this.companions.add(c);
      this.placeActorAt(c, spawn.x + (i === 0 ? -50 : 50), spawn.y + 30, true);
    });
    this.enemies = this.physics.add.group({ collideWorldBounds: true });
    this.loots = this.physics.add.group();
    this.blockers = this.physics.add.staticGroup();
    this.interactables = [];
    this.playerProjectiles = this.physics.add.group({ classType: Projectile, runChildUpdate: true });
    this.enemyProjectiles = this.physics.add.group({ classType: Projectile, runChildUpdate: true });
    this.buildPortal();
    this.spawnEnemies();
    this.aimMarker = this.add.image(0, 0, 'glow').setTint(0xff6b5c).setScale(0.5).setAlpha(0.7).setDepth(DEPTH.DECAL + 1).setVisible(false);

    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.player, this.blockers);
    this.physics.add.collider(this.companions, this.blockers);
    this.physics.add.collider(this.enemies, this.blockers);
    this.physics.add.collider(this.enemies, this.layer);
    this.physics.add.collider(this.player, this.enemies);
    this.physics.add.collider(this.companions, this.layer);
    this.physics.add.collider(this.playerProjectiles, this.layer, (p) => p.kill());
    this.physics.add.collider(this.enemyProjectiles, this.layer, (p) => p.kill());
    this.physics.add.overlap(this.playerProjectiles, this.enemies, this.onProjectileHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemyProjectiles, this.onProjectileHitParty, null, this);
    this.physics.add.overlap(this.companions, this.enemyProjectiles, this.onProjectileHitParty, null, this);
    this.physics.add.overlap(this.player, this.loots, (pl, loot) => loot.active && loot.pickup(pl));
    this.physics.add.overlap(this.player, this.portal, () => this.tryExit());

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_COLS * TILE, MAP_ROWS * TILE);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    cam.fadeIn(400, 0, 0, 0);

    this.inputs.bind();
    this.events.off('resume', this.onResume, this);
    this.events.on('resume', this.onResume, this);
    this.events.off('shutdown', this.onShutdown, this);
    this.events.on('shutdown', this.onShutdown, this);

    if (!this.scene.isActive('SceneUI')) this.scene.launch('SceneUI', { mode: 'game' });
    this.time.delayedCall(350, () => {
      const mods = this.mods.ids.length ? t('game.modsSuffix', { list: this.modNames().join(' · ') }) : '';
      const params = { floor: this.floorLabel(), boss: t(`enemy.${this.dungeonDef.boss}`), mods };
      const msg = t(this.isBossFloor ? 'game.introBoss' : 'game.intro', params);
      this.events.emit('log', msg, '#ffffff');
    });
  }

  floorLabel() {
    const dungeon = t(`dungeon.${this.dungeonDef.id}.name`);
    if (Number.isFinite(this.run.floors)) return t('game.floorLabelOf', { dungeon, floor: this.floor, floors: this.run.floors });
    return t('game.floorLabel', { dungeon, floor: this.floor });
  }

  modNames() {
    return this.mods.ids.map((id) => t(`modifier.${id}.name`));
  }

  onResume() {
    this.inputs.reset();
  }

  get entities() {
    return this.registry_.map;
  }

  get keys() {
    return this.inputs.keys;
  }

  registerEntity(obj) {
    return this.registry_.register(obj);
  }

  unregisterEntity(obj) {
    this.registry_.unregister(obj);
  }

  entityById(id) {
    return this.registry_.byId(id);
  }

  onShutdown() {
    this.clearHitStop();
    if (this.registry_) this.registry_.clear();
    if (this.hazards) this.hazards.clear();
    if (this.fxTweens) {
      this.fxTweens.destroy();
      this.fxTweens = null;
    }
  }

  buildMap() {
    const gen = { ...this.dungeonDef.gen };
    gen.roomCount = (gen.roomCount || 8) + Math.min(3, Math.floor(this.floor / 4));
    gen.floor = this.floor;
    this.mapRng = floorRng(this.run.seed, this.floor, 'map');
    this.spawnRng = floorRng(this.run.seed, this.floor, 'spawn');
    gen.roomRng = floorRng(this.run.seed, this.floor, 'rooms');
    gen.roomPlan = this.dungeonDef.roomPlan;
    this.dungeon = generateDungeon(MAP_COLS, MAP_ROWS, gen, this.mapRng);
    this.nav = new Navigation(this.dungeon.grid);
    this.decorateRooms();
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: MAP_COLS, height: MAP_ROWS });
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
    this.floorLayer.setTint(this.dungeonDef.tint);
    this.layer.setTint(this.dungeonDef.tint);
    this.layer.setCollisionByExclusion([-1]);
    this.physics.world.setBounds(0, 0, MAP_COLS * TILE, MAP_ROWS * TILE);
    this.map = map;
  }

  isFloorAt(x, y) {
    const { tx, ty } = this.nav.toTile(x, y);
    return this.nav.isFloor(tx, ty);
  }

  buildPortal() {
    const c = tileToWorld(this.dungeon.exitRoom.cx, this.dungeon.exitRoom.cy);
    this.portal = this.physics.add.staticImage(c.x, c.y, 'dungeon', 'floor_stairs').setScale(3).setDepth(DEPTH.DECAL).setTint(0x555555);
    this.portal.refreshBody();
    this.portalGlow = this.add.image(c.x, c.y + 4, 'glow').setDepth(DEPTH.DECAL).setTint(0x8be3ff).setScale(1.6).setVisible(false);
  }

  bossEnrageParams() {
    return { ...BALANCE.bossEnrage, ...(this.dungeonDef.bossEnrage || {}) };
  }

  enemyScale() {
    const lvl = this.level;
    const def = this.dungeonDef;
    const per = def.perFloor || 0.15;
    const growth = 1 + per * (lvl - 1);
    return {
      level: lvl,
      hp: (1 + (def.enemyScale && def.enemyScale.hp !== undefined ? def.enemyScale.hp : BALANCE.enemyHpPerLevel) * (lvl - 1)) * this.mods.enemyHpMul,
      atk: (1 + BALANCE.enemyAtkPerLevel * (lvl - 1)) * this.mods.enemyAtkMul,
      xp: growth * this.mods.xpMul,
      gold: 1 + BALANCE.enemyGoldPerLevel * (lvl - 1),
      speed: this.mods.enemySpeedMul,
      breakMax: this.mods.breakMaxMul,
    };
  }

  decorateRooms() {
    for (const room of this.dungeon.rooms) {
      const props = getRoomType(room.type).props;
      const n = this.spawnRng.between(props.count[0], props.count[1]);
      for (let i = 0; i < n && props.frames.length; i++) {
        const tx = this.spawnRng.between(room.x, room.x + room.w - 1);
        const ty = this.spawnRng.between(room.y, room.y + room.h - 1);
        if (Math.abs(tx - room.cx) <= 1 && Math.abs(ty - room.cy) <= 1) continue;
        const w = tileToWorld(tx, ty);
        this.add.image(w.x + this.spawnRng.between(-8, 8), w.y + this.spawnRng.between(-6, 6), 'dungeon', this.spawnRng.pick(props.frames)).setScale(3).setDepth(DEPTH.DECAL).setAlpha(0.9);
      }
    }
  }

  spawnRoomFeatures() {
    for (const room of this.dungeon.rooms) {
      const handler = getRoomType(room.type);
      if (handler.spawn) handler.spawn(this, room);
    }
  }

  remainingInRoom(room) {
    let n = 0;
    for (const e of this.enemies.getChildren()) if (e.active && e.room === room) n++;
    return n;
  }

  findInteractable() {
    if (!this.player || this.player.dead) return null;
    for (const it of this.interactables) if (it.active && it.canInteract(this.player)) return it;
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

  spawnPack(room, cells, size, opts = {}) {
    const table = spawnTableFor(this.dungeonDef, this.floor);
    let placed = 0;
    for (let i = 0; i < size; i++) {
      const cell = cells[i % cells.length];
      const w = tileToWorld(cell.tx, cell.ty);
      const e = this.addEnemy(pickWeighted(table, this.spawnRng), w.x, w.y, true, opts);
      if (e) {
        e.room = room;
        placed++;
      }
    }
    return placed;
  }

  dropChestRewards(x, y, bonus = {}) {
    this.rewards.dropChestRewards(x, y, bonus);
  }

  openChest(chest) {
    this.rewards.openChest(chest);
  }

  spawnMimic(chest) {
    const room = chest.room;
    this.dungeon.grid[room.cy][room.cx] = 1;
    const x = chest.baseX;
    const y = chest.y;
    chest.destroy();
    const e = this.addEnemy('mimic', x, y, false);
    if (e) {
      e.room = room;
      e.aggro = true;
    }
    this.events.emit('log', t('game.mimic'), '#ff8ab0');
    this.cameras.main.shake(200, 0.006);
    return e;
  }

  spawnEnemies() {
    const { rooms, spawnRoom, exitRoom } = this.dungeon;
    this.spawnRoomFeatures();
    const candidates = rooms.filter((r) => getRoomType(r.type).allowsPacks && r !== spawnRoom && (!this.isBossFloor || r !== exitRoom));
    let count = Math.min(BALANCE.enemyCountMax, BALANCE.enemyCountBase + this.floor * BALANCE.enemyCountPerFloor);
    if (this.isBossFloor) count = Math.floor(count * BALANCE.bossFloorCountMul);
    count = Math.round(count * this.mods.enemyCountMul);
    const spawn = tileToWorld(spawnRoom.cx, spawnRoom.cy);
    let placed = 0;
    let attempts = 0;
    while (placed < count && candidates.length && attempts < count * 10) {
      attempts++;
      const room = this.spawnRng.pick(candidates);
      const anchorTile = roomRandomTile(room, this.spawnRng);
      const anchor = tileToWorld(anchorTile.x, anchorTile.y);
      if (Phaser.Math.Distance.Between(anchor.x, anchor.y, spawn.x, spawn.y) < 300) continue;
      const packSize = Math.min(count - placed, this.spawnRng.between(BALANCE.packMin, BALANCE.packMax));
      const cells = this.packCells(anchorTile.x, anchorTile.y, 2);
      placed += this.spawnPack(room, cells, packSize);
    }
    if (this.isBossFloor) {
      const c = tileToWorld(exitRoom.cx, exitRoom.cy - 1);
      this.boss = this.addEnemy(this.dungeonDef.boss, c.x, c.y, false);
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

  addEnemy(typeId, x, y, jitter = true, opts = {}) {
    const def = ENEMIES[typeId];
    const spot = this.nav.nearestClearWorld(x, y, def.bodyRadius * def.scale);
    if (!spot) return null;
    const e = new Enemy(this, spot.x, spot.y, typeId, { ...this.enemyScale(), elite: !!opts.elite });
    this.enemies.add(e);
    if (e.def.boss) e.body.setImmovable(true);
    this.placeActorAt(e, spot.x, spot.y, jitter);
    return e;
  }

  summonMinions(source, n, typeId = 'goblin', cap = 16) {
    if (this.enemies.countActive(true) >= cap) return;
    const origin = this.nav.toTile(source.body.center.x, source.body.center.y);
    const cells = this.packCells(origin.tx, origin.ty, 2).filter((c) => c.d >= 1);
    for (let i = 0; i < n; i++) {
      const cell = cells.length ? cells[i % cells.length] : origin;
      const w = tileToWorld(cell.tx, cell.ty);
      const e = this.addEnemy(typeId, w.x, w.y);
      if (!e) continue;
      e.aggro = true;
      FX.burst(this, e.x, e.y, 0xff8ab0, 8, 30);
    }
  }

  remaining() {
    return this.enemies.countActive(true);
  }

  alertPack(source) {
    for (const e of this.enemies.getChildren()) {
      if (!e.active || e.aggro || e === source) continue;
      if (Phaser.Math.Distance.Between(source.x, source.y, e.x, e.y) <= BALANCE.packAlertRange) e.aggro = true;
    }
  }

  partyMembers() {
    const list = [];
    if (!this.player.dead) list.push(this.player);
    for (const c of this.companions.getChildren()) if (c.active && !c.downed) list.push(c);
    return list;
  }

  nearestTarget(x, y, playerBias = 1) {
    let best = null;
    let bestD = Infinity;
    for (const m of this.partyMembers()) {
      const d = Phaser.Math.Distance.Between(x, y, m.x, m.y) * (m === this.player ? 1 : playerBias);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  toggleTactic(index) {
    const c = this.companions.getChildren()[index];
    if (!c) return;
    const next = TACTICS[(TACTICS.indexOf(c.tactic) + 1) % TACTICS.length];
    c.setTactic(next);
    const tactics = { ...(this.registry.get('tactics') || {}), [c.clsId]: next };
    this.registry.set('tactics', tactics);
    this.events.emit('log', t('game.tacticChanged', { name: t(`class.${c.clsId}.name`), tactic: t(`tactic.${next}`) }), FX.cssColor(c.cls.color));
  }

  nearestEnemy(x, y, range) {
    let best = null;
    let bestD = range;
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y) - e.radius;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  nearestEnemyInCone(x, y, range, dir, halfAngle) {
    let best = null;
    let bestD = range;
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y) - e.radius;
      if (d >= bestD) continue;
      const a = Phaser.Math.Angle.Between(x, y, e.x, e.y);
      if (Math.abs(Phaser.Math.Angle.Wrap(a - dir)) > halfAngle) continue;
      bestD = d;
      best = e;
    }
    return best;
  }

  meleeHit(x, y, angle, range, arcDeg, dmgFn, breakAmt, source = this.player, knockback) {
    const half = Phaser.Math.DegToRad(arcDeg / 2);
    const results = [];
    for (const e of [...this.enemies.getChildren()]) {
      if (!e.active) continue;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) - e.radius > range) continue;
      const a = Phaser.Math.Angle.Between(x, y, e.x, e.y);
      if (Math.abs(Phaser.Math.Angle.Wrap(a - angle)) > half) continue;
      const r = e.takeDamage(dmgFn(), breakAmt, a, { knockback });
      source.onDealt(r.amount);
      results.push(r);
    }
    return results;
  }

  aoeHit(x, y, radius, dmgFn, breakAmt, effects = {}, source = this.player, knockback) {
    const now = this.combatNow;
    const results = [];
    for (const e of [...this.enemies.getChildren()]) {
      if (!e.active) continue;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) - e.radius > radius) continue;
      const a = Phaser.Math.Angle.Between(x, y, e.x, e.y);
      if (effects.slow) e.slowUntil = now + effects.slow;
      if (effects.burn) {
        e.dotUntil = now + effects.burn.duration;
        e.dotDamage = effects.burn.damage;
        e.nextDot = now + 500;
      }
      const r = e.takeDamage(dmgFn(), breakAmt, a, { knockback });
      source.onDealt(r.amount);
      results.push(r);
    }
    return results;
  }

  fireProjectile(owner, x, y, angle, cfg) {
    const c = { ...cfg };
    if (c.texture === 'arrow') {
      c.atlasFrame = 'weapon_arrow';
      c.rotationOffset = Math.PI / 2;
      c.scale = 2;
    }
    if (c.texture === 'proj_wave') c.scale = 1.5;
    const group = owner === 'player' ? this.playerProjectiles : this.enemyProjectiles;
    const p = group.get(x, y);
    if (!p) return null;
    p.fire(owner, x, y, angle, c);
    return p;
  }

  onProjectileHitEnemy(a, b) {
    const p = a.cfg ? a : b;
    const e = a.cfg ? b : a;
    if (!p.cfg || !p.hits || !p.active || !e.active || p.hits.has(e)) return;
    p.hits.add(e);
    const angle = p.rotation - (p.cfg.rotationOffset || 0);
    const r = e.takeDamage(p.cfg.damage, p.cfg.breakAmt, angle, { knockback: p.cfg.knockback });
    const source = p.cfg.source && p.cfg.source.active ? p.cfg.source : this.player;
    source.onDealt(r.amount);
    applyHits(source, [r], p.cfg.impact);
    if (!p.cfg.pierce) p.kill();
  }

  onProjectileHitParty(a, b) {
    const p = a.cfg ? a : b;
    const target = a.cfg ? b : a;
    if (!p.cfg || !p.active || target.dead || target.downed) return;
    p.kill();
    FX.burst(this, p.x, p.y, 0xff5cd6, 5, 20);
    target.takeDamage(p.cfg.damage, this.combatNow);
  }

  hitStop(ms) {
    const end = this.time.now + ms;
    if (end <= this.hitStopEnd) return;
    this.hitStopEnd = end;
    const s = BALANCE.hitStopScale;
    this.physics.world.pause();
    this.anims.globalTimeScale = s;
    this.tweens.timeScale = s;
  }

  clearHitStop() {
    if (this.physics && this.physics.world) this.physics.world.resume();
    if (this.anims) this.anims.globalTimeScale = 1;
    if (this.tweens) this.tweens.timeScale = 1;
    this.hitStopEnd = 0;
  }

  advanceCombatClock(delta) {
    if (this.hitStopEnd && this.time.now >= this.hitStopEnd) this.clearHitStop();
    const d = this.hitStopEnd ? delta * BALANCE.hitStopScale : delta;
    this.combatNow += d;
    return d;
  }

  itemOpts() {
    return this.rewards.itemOpts();
  }

  onEnemyKilled(e) {
    this.rewards.onEnemyKilled(e);
  }

  dropLoot(x, y, payload) {
    this.rewards.dropLoot(x, y, payload);
  }

  openPortal() {
    this.flow.openPortal();
  }

  tryExit() {
    this.flow.tryExit();
  }

  nextFloor() {
    this.flow.nextFloor();
  }

  finishRun() {
    this.flow.finishRun();
  }

  onPlayerDead() {
    this.flow.onPlayerDead();
  }

  save() {
    this.flow.save();
  }

  returnToHub() {
    this.flow.returnToHub();
  }

  update(time, delta) {
    const t0 = performance.now();
    this.step(delta);
    this.perfUpdateMs = performance.now() - t0;
  }

  step(realDelta) {
    const delta = this.advanceCombatClock(realDelta);
    if (!this.player || this.transitioning) return;
    const time = this.combatNow;
    this.interactTarget = this.findInteractable();
    if (!this.player.dead) {
      const input = this.inputs.collect(this.interactTarget);
      if (input.interact) this.interactTarget.interact();
      this.player.update(time, delta, input.move, input.actions);
    }
    this.aimMarker.setVisible(InputState.aim.active).setPosition(InputState.aim.x, InputState.aim.y);
    for (const c of this.companions.getChildren()) c.update(time, delta);
    for (const e of [...this.enemies.getChildren()]) e.update(time, delta);
    this.hazards.update(time);
    for (const it of [...this.interactables]) if (it.active && it.update) it.update(time);
    this.events.emit('hud', buildHud(this, time));
  }
}
