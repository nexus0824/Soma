export function computeStats(cls, level, equipment) {
  const b = cls.base;
  const s = {
    maxHp: b.hp + b.hpPerLevel * (level - 1),
    maxMp: b.mp + b.mpPerLevel * (level - 1),
    atk: b.atk + b.atkPerLevel * (level - 1),
    def: b.def + Math.floor((level - 1) * 0.5),
    speed: b.speed,
    crit: b.crit,
    mpRegen: b.mpRegen,
    lifesteal: 0,
    cdr: 0,
    atkMul: 0,
  };
  const apply = (stat, value) => {
    if (stat === 'hp') s.maxHp += value;
    else if (stat === 'mp') s.maxMp += value;
    else s[stat] += value;
  };
  for (const item of Object.values(equipment)) {
    if (!item) continue;
    apply(item.base.stat, item.base.value);
    for (const a of item.affixes) apply(a.stat, a.value);
  }
  s.atk = Math.round(s.atk * (1 + s.atkMul));
  s.maxHp = Math.round(s.maxHp);
  s.maxMp = Math.round(s.maxMp);
  s.cdr = Math.min(0.5, s.cdr);
  s.crit = Math.min(0.75, s.crit);
  return s;
}
