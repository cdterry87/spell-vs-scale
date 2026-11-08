// All numeric balance values are PROVISIONAL and tuned here, never in components.

export const GAME_CONFIG = Object.freeze({
  wizard: { maxHp: 175, maxMp: 100, manaRegen: 5, potions: 5, potionRestore: 35 },
  dragon: { name: 'Solinvictus', maxHp: 350, enrageThresholds: [0.75, 0.5, 0.25] },
  baseMissChance: 0.05,
  blindMissChance: 0.5,
  burnDamage: 8,
  statusImmunityTurns: 1,
  enrageDamageMultiplier: 1.5,
  enrageAttackCharges: 3,
  enrageStatusResistancePoints: 10,
  crystallizeDamageMultiplier: 0.5,
  crystallizeStatusChanceMultiplier: 0.5,
  fireStormCooldown: 3,
  arcanumCooldown: 3,
  // Pure disallow rule: potions are disabled when MP is already full.
  disablePotionAtFullMp: true,
});

// Presentation pacing only. These delays never decide damage, turn order or the winner.
export const TIMING = Object.freeze({
  afterPlayerAction: 900,
  afterDragonAction: 800,
  skippedTurn: 900,
  beforeResults: 1600,
});
