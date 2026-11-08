import { GAME_CONFIG } from './config.js';

/** Seedable PRNG (mulberry32). Returns a function producing floats in [0, 1). */
export function createRng(seed = Date.now()) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Inclusive integer roll in [min, max]. */
export function rollInt(min, max, rng) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** True with probability p (0–1). */
export function rollChance(p, rng) {
  if (p <= 0) return false;
  if (p >= 1) return true;
  return rng() < p;
}

/**
 * Accuracy check. Base miss and Blind are independent checks, so a blinded
 * attacker misses 1 - (1 - base) × (1 - blind) of the time.
 * @returns {{ hit: boolean, reason: null | 'miss' | 'blind' }}
 */
export function rollHit({ blinded = false } = {}, rng, config = GAME_CONFIG) {
  if (rollChance(config.baseMissChance, rng)) return { hit: false, reason: 'miss' };
  if (blinded && rollChance(config.blindMissChance, rng)) return { hit: false, reason: 'blind' };
  return { hit: true, reason: null };
}

/** Combined miss probability for display and tests. */
export function missChance({ blinded = false } = {}, config = GAME_CONFIG) {
  const base = config.baseMissChance;
  return blinded ? 1 - (1 - base) * (1 - config.blindMissChance) : base;
}

/**
 * Final direct damage: base → Enrage bonus → Crystallize reduction → round once.
 */
export function calculateDamage(
  base,
  { enraged = false, crystallized = false } = {},
  config = GAME_CONFIG,
) {
  let value = base;
  if (enraged) value *= config.enrageDamageMultiplier;
  if (crystallized) value *= config.crystallizeDamageMultiplier;
  return Math.max(0, Math.round(value));
}

/** Subtract HP, clamped at zero. Returns the damage actually taken. */
export function applyDamage(target, amount) {
  const actual = clamp(Math.round(amount), 0, target.hp);
  target.hp -= actual;
  return actual;
}

/** Restore HP, capped at max. Returns the HP actually restored. */
export function applyHeal(target, amount) {
  const actual = clamp(Math.round(amount), 0, target.maxHp - target.hp);
  target.hp += actual;
  return actual;
}

/** Restore MP, capped at max. Returns the MP actually restored. */
export function restoreMana(wizard, amount) {
  const actual = clamp(Math.round(amount), 0, wizard.maxMp - wizard.mp);
  wizard.mp += actual;
  return actual;
}
