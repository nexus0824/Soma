export const InputState = {
  moveX: 0,
  moveY: 0,
  attack: false,
  attackPressed: false,
  skills: [false, false, false],
  dodgePressed: false,
  dodgeTarget: null,
  aim: { active: false, x: 0, y: 0, until: 0 },
  reset() {
    this.moveX = 0;
    this.moveY = 0;
    this.attack = false;
    this.attackPressed = false;
    this.skills = [false, false, false];
    this.dodgePressed = false;
    this.dodgeTarget = null;
    this.aim.active = false;
    this.aim.until = 0;
  },
  setAim(x, y, now, hold = 400) {
    this.aim.x = x;
    this.aim.y = y;
    this.aim.active = true;
    this.aim.until = now + hold;
  },
  releaseAim(now, hold = 400) {
    this.aim.active = false;
    this.aim.until = now + hold;
  },
  hasAim(now) {
    return this.aim.active || now < this.aim.until;
  },
  snapshot() {
    return {
      moveX: this.moveX,
      moveY: this.moveY,
      attack: this.attack,
      attackPressed: this.attackPressed,
      skills: [...this.skills],
      dodgePressed: this.dodgePressed,
      dodgeTarget: this.dodgeTarget ? { x: this.dodgeTarget.x, y: this.dodgeTarget.y } : null,
      aim: { ...this.aim },
    };
  },
  applySnapshot(s) {
    this.moveX = s.moveX;
    this.moveY = s.moveY;
    this.attack = s.attack;
    this.attackPressed = s.attackPressed;
    this.skills = [...s.skills];
    this.dodgePressed = s.dodgePressed;
    this.dodgeTarget = s.dodgeTarget ? { x: s.dodgeTarget.x, y: s.dodgeTarget.y } : null;
    this.aim.active = s.aim.active;
    this.aim.x = s.aim.x;
    this.aim.y = s.aim.y;
    this.aim.until = s.aim.until;
  },
};
