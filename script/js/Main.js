import { GAME_WIDTH, GAME_HEIGHT } from './Define.js';
import ScenePreload from './scene/ScenePreload.js';
import SceneTitle from './scene/SceneTitle.js';
import SceneHub from './scene/SceneHub.js';
import SceneGame from './scene/SceneGame.js';
import SceneUI from './scene/SceneUI.js';
import SceneResult from './scene/SceneResult.js';
import SceneDebug from './debug/SceneDebug.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0d14',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  input: { activePointers: 3 },
  scene: [ScenePreload, SceneTitle, SceneHub, SceneGame, SceneUI, SceneResult, SceneDebug],
};

window.somaGame = new Phaser.Game(config);
