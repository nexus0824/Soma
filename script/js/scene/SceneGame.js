import { TILE, MAP_COLS, MAP_ROWS, DEPTH } from '../Define.js';
import { t } from '../i18n/I18n.js';
import { CLASSES } from '../data/Classes.js';
import { DUNGEONS, difficultyLevel, isBossFloor } from '../data/Dungeons.js';
import { combineModifiers } from '../data/Modifiers.js';
import Player from '../core/Player.js';
import Companion from '../core/Companion.js';
import Projectile from '../core/Projectile.js';
import { tileToWorld } from '../core/Dungeon.js';
import { InputState } from '../core/InputState.js';
import HazardManager from '../combat/Hazards.js';
import { GAME_RNG } from '../core/Rng.js';
import EntityRegistry from './game/EntityRegistry.js';
import InputCollector from './game/InputCollector.js';
import { buildHud } from './game/HudBuilder.js';
import RunFlow from './game/RunFlow.js';
import RewardSystem from './game/RewardSystem.js';
import CombatSystem from './game/CombatSystem.js';
import Targeting from './game/Targeting.js';
import SpawnSystem from './game/SpawnSystem.js';
import WorldSystem from './game/WorldSystem.js';

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
    this.fxTweens = new Phaser.Tweens.TweenManager(this);
    this.hazards = new HazardManager(this);
    this.registry_ = new EntityRegistry();
    this.world = new WorldSystem(this);
    this.spawner = new SpawnSystem(this);
    this.combat = new CombatSystem(this);
    this.targeting = new Targeting(this);
    this.rewards = new RewardSystem(this);
    this.flow = new RunFlow(this);
    this.inputs = new InputCollector(this);
    this.fxTweens.start();
    this.isBossFloor = isBossFloor(this.dungeonDef, this.floor, this.run.floors);
    this.character.setBest(this.run.dungeonId, this.floor);
    this.world.buildMap();

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
    this.world.createBlockers();
    this.playerProjectiles = this.physics.add.group({ classType: Projectile, runChildUpdate: true });
    this.enemyProjectiles = this.physics.add.group({ classType: Projectile, runChildUpdate: true });
    this.world.buildPortal();
    this.spawner.spawnEnemies();
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

  onShutdown() {
    this.clearHitStop();
    if (this.registry_) this.registry_.clear();
    if (this.hazards) this.hazards.clear();
    if (this.fxTweens) {
      this.fxTweens.destroy();
      this.fxTweens = null;
    }
  }

  get combatNow() {
    return this.combat.now;
  }

  get hitStopEnd() {
    return this.combat.hitStopEnd;
  }

  get entities() {
    return this.registry_.map;
  }

  get keys() {
    return this.inputs.keys;
  }

  get dungeon() {
    return this.world.dungeon;
  }

  get nav() {
    return this.world.nav;
  }

  get map() {
    return this.world.map;
  }

  get layer() {
    return this.world.layer;
  }

  get floorLayer() {
    return this.world.floorLayer;
  }

  get portal() {
    return this.world.portal;
  }

  get portalGlow() {
    return this.world.portalGlow;
  }

  get explored() {
    return this.world.explored;
  }

  get blockers() {
    return this.world.blockers;
  }

  get interactables() {
    return this.world.interactables;
  }

  get mapRng() {
    return this.world.mapRng;
  }

  get spawnRng() {
    return this.world.spawnRng;
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

  isFloorAt(x, y) {
    return this.world.isFloorAt(x, y);
  }

  packCells(tx, ty, ring) {
    return this.world.packCells(tx, ty, ring);
  }

  placeActorAt(actor, x, y, jitter = false) {
    return this.world.placeActorAt(actor, x, y, jitter);
  }

  findInteractable() {
    return this.world.findInteractable(this.player);
  }

  addInteractable(obj, solid = false) {
    return this.world.addInteractable(obj, solid);
  }

  removeInteractable(obj) {
    this.world.removeInteractable(obj);
  }

  bossEnrageParams() {
    return this.spawner.bossEnrageParams();
  }

  enemyScale() {
    return this.spawner.enemyScale();
  }

  spawnEnemies() {
    this.spawner.spawnEnemies();
  }

  spawnRoomFeatures() {
    this.spawner.spawnRoomFeatures();
  }

  spawnPack(room, cells, size, opts = {}) {
    return this.spawner.spawnPack(room, cells, size, opts);
  }

  spawnMimic(chest) {
    return this.spawner.spawnMimic(chest);
  }

  addEnemy(typeId, x, y, jitter = true, opts = {}) {
    return this.spawner.addEnemy(typeId, x, y, jitter, opts);
  }

  summonMinions(source, n, typeId = 'goblin', cap = 16) {
    this.spawner.summonMinions(source, n, typeId, cap);
  }

  remaining() {
    return this.spawner.remaining();
  }

  remainingInRoom(room) {
    return this.spawner.remainingInRoom(room);
  }

  alertPack(source) {
    this.spawner.alertPack(source);
  }

  partyMembers() {
    return this.targeting.partyMembers();
  }

  nearestTarget(x, y, playerBias = 1) {
    return this.targeting.nearestTarget(x, y, playerBias);
  }

  nearestEnemy(x, y, range) {
    return this.targeting.nearestEnemy(x, y, range);
  }

  nearestEnemyInCone(x, y, range, dir, halfAngle) {
    return this.targeting.nearestEnemyInCone(x, y, range, dir, halfAngle);
  }

  toggleTactic(index) {
    this.targeting.toggleTactic(index);
  }

  meleeHit(x, y, angle, range, arcDeg, dmgFn, breakAmt, source = this.player, knockback) {
    return this.combat.meleeHit(x, y, angle, range, arcDeg, dmgFn, breakAmt, source, knockback);
  }

  aoeHit(x, y, radius, dmgFn, breakAmt, effects = {}, source = this.player, knockback) {
    return this.combat.aoeHit(x, y, radius, dmgFn, breakAmt, effects, source, knockback);
  }

  fireProjectile(owner, x, y, angle, cfg) {
    return this.combat.fireProjectile(owner, x, y, angle, cfg);
  }

  onProjectileHitEnemy(a, b) {
    this.combat.onProjectileHitEnemy(a, b);
  }

  onProjectileHitParty(a, b) {
    this.combat.onProjectileHitParty(a, b);
  }

  hitStop(ms) {
    this.combat.hitStop(ms);
  }

  clearHitStop() {
    if (this.combat) this.combat.clearHitStop();
  }

  advanceCombatClock(delta) {
    return this.combat.advanceCombatClock(delta);
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

  dropChestRewards(x, y, bonus = {}) {
    this.rewards.dropChestRewards(x, y, bonus);
  }

  openChest(chest) {
    this.rewards.openChest(chest);
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
