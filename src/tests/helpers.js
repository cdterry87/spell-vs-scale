import { DRAGON_ABILITIES, DRAGON_ATTACK_ORDER } from '../game/dragonAbilities.js';

/**
 * Scripted RNG: returns the given values in order, then `fallback` forever.
 * 0.99 means "miss nothing / resist everything / max roll"; 0 means "always trigger / min roll".
 */
export function scriptedRng(values = [], fallback = 0.5) {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : fallback);
}

/** RNG that always returns the same value. */
export const constantRng = (value) => () => value;

/** A roll strictly between two probabilities (for "passes one threshold but not the other"). */
export const between = (low, high) => (low + high) / 2;

/** Roll value that makes rollInt return the top of a range. */
export const MAX_ROLL = 0.9999;

/** Roll value that makes the weighted dragon AI pick `id` when every attack is eligible. */
export function pickRoll(id, order = DRAGON_ATTACK_ORDER) {
  const total = order.reduce((sum, key) => sum + DRAGON_ABILITIES[key].weight, 0);
  let start = 0;
  for (const key of order) {
    const weight = DRAGON_ABILITIES[key].weight;
    if (key === id) return (start + weight / 2) / total;
    start += weight;
  }
  throw new Error(`Unknown attack ${id}`);
}
