import { GAME_CONFIG } from './config.js';

/** Dragon actions. `normal` attacks are the ones Enrage boosts and consumes charges on. */
export const DRAGON_ABILITIES = Object.freeze({
  claw: {
    id: 'claw',
    name: 'Claw Attack',
    damage: [10, 16],
    weight: 40,
    normal: true,
  },
  fireBreath: {
    id: 'fireBreath',
    name: 'Fire Breath',
    damage: [14, 20],
    weight: 30,
    normal: true,
    status: { id: 'burn', chance: 0.3 },
  },
  tailStrike: {
    id: 'tailStrike',
    name: 'Tail Strike',
    damage: [12, 18],
    weight: 20,
    normal: true,
    status: { id: 'stun', chance: 0.3 },
  },
  fireStorm: {
    id: 'fireStorm',
    name: 'Fire Storm',
    damage: [30, 40],
    weight: 10,
    normal: false,
    status: { id: 'burn', chance: 0.6 },
    cooldown: GAME_CONFIG.fireStormCooldown,
  },
});

export const DRAGON_ATTACK_ORDER = ['claw', 'fireBreath', 'tailStrike', 'fireStorm'];
