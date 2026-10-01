import { InputState } from '../../core/InputState.js';

export default class InputCollector {
  constructor(scene) {
    this.scene = scene;
    this.keys = null;
  }

  bind() {
    this.keys = this.scene.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
      attack: 'J', dodge: 'SPACE', s1: 'K', s2: 'L', s3: 'SEMICOLON', interact: 'E',
    });
    this.scene.input.mouse.disableContextMenu();
  }

  reset() {
    this.scene.input.keyboard.resetKeys();
    InputState.reset();
  }

  collect(interactTarget) {
    const k = this.keys;
    let mx = (k.right.isDown || k.right2.isDown ? 1 : 0) - (k.left.isDown || k.left2.isDown ? 1 : 0);
    let my = (k.down.isDown || k.down2.isDown ? 1 : 0) - (k.up.isDown || k.up2.isDown ? 1 : 0);
    if (mx === 0 && my === 0) {
      mx = InputState.moveX;
      my = InputState.moveY;
    }
    const JustDown = Phaser.Input.Keyboard.JustDown;
    let attackPressed = JustDown(k.attack) || InputState.attackPressed;
    let attackHeld = k.attack.isDown || InputState.attack;
    let interact = false;
    if (interactTarget) {
      interact = attackPressed || JustDown(k.interact);
      attackPressed = false;
      attackHeld = false;
    }
    const actions = {
      attack: attackHeld,
      attackPressed,
      dodge: JustDown(k.dodge) || InputState.dodgePressed,
      dodgeTarget: InputState.dodgeTarget,
      skills: [
        JustDown(k.s1) || InputState.skills[0],
        JustDown(k.s2) || InputState.skills[1],
        JustDown(k.s3) || InputState.skills[2],
      ],
    };
    InputState.skills = [false, false, false];
    InputState.attackPressed = false;
    InputState.dodgePressed = false;
    InputState.dodgeTarget = null;
    return { move: { x: mx, y: my }, actions, interact };
  }
}
