import { GAME_CONFIG } from './config.js';
import { DRAGON_ABILITIES, DRAGON_ATTACK_ORDER } from './dragonAbilities.js';
import { isDisabled } from './statusEffects.js';

export const isEnraged = (dragon) => dragon.enrageAttacksRemaining > 0;

/** Turns left before a cooldown ability is usable, as seen at actor turn `currentTurn`. */
export function cooldownRemaining(cooldowns, id, currentTurn) {
  const availableAt = cooldowns[id];
  return availableAt ? Math.max(0, availableAt - currentTurn) : 0;
}

/**
 * Unlock Enrage uses for HP thresholds crossed (strictly below 75/50/25%).
 * Called immediately after every change to dragon HP. Returns how many unlocked.
 */
export function checkEnrageThresholds(dragon, config = GAME_CONFIG) {
  if (dragon.hp <= 0) return 0;
  let unlocked = 0;
  config.dragon.enrageThresholds.forEach((ratio, i) => {
    if (!dragon.enrageThresholdsUsed[i] && dragon.hp < dragon.maxHp * ratio) {
      dragon.enrageThresholdsUsed[i] = true;
      dragon.pendingEnrageUses += 1;
      unlocked += 1;
    }
  });
  return unlocked;
}

/** Attacks the dragon may pick this turn. `turn` is the dragon's current actor turn. */
export function eligibleAttacks(dragon, turn) {
  return DRAGON_ATTACK_ORDER.filter((id) => {
    if (id !== 'fireStorm') return true;
    // Pending Enrage blocks new Fire Storm wind-ups, avoiding a Fire Storm/Enrage deadlock.
    if (dragon.pendingEnrageUses > 0) return false;
    return cooldownRemaining(dragon.cooldowns, 'fireStorm', turn) === 0;
  });
}

/** Weighted random choice among eligible attacks, with weights renormalized. */
export function selectWeightedAttack(dragon, turn, rng) {
  const options = eligibleAttacks(dragon, turn);
  const total = options.reduce((sum, id) => sum + DRAGON_ABILITIES[id].weight, 0);
  let roll = rng() * total;
  for (const id of options) {
    roll -= DRAGON_ABILITIES[id].weight;
    if (roll < 0) return id;
  }
  return options[options.length - 1];
}

/**
 * Decide the dragon's action for this turn, in strict priority order.
 * Assumes start-of-turn Burn has resolved and the dragon is still alive.
 * @returns {{ type: 'skip' | 'releaseFireStorm' | 'enrage' | 'attack', attackId?: string }}
 */
export function decideDragonAction(dragon, turn, rng) {
  if (isDisabled(dragon)) return { type: 'skip' };
  if (dragon.chargingFireStorm) return { type: 'releaseFireStorm' };
  if (dragon.pendingEnrageUses > 0 && !isEnraged(dragon)) return { type: 'enrage' };
  return { type: 'attack', attackId: selectWeightedAttack(dragon, turn, rng) };
}
