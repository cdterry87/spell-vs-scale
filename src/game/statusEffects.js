import { GAME_CONFIG } from './config.js';
import { clamp, rollChance } from './combat.js';

/** Negative status catalog. Durations count the affected combatant's own turns. */
export const STATUS_DEFS = Object.freeze({
  burn: {
    id: 'burn',
    name: 'Burn',
    symbol: '🔥',
    duration: 3,
    description: `Takes ${GAME_CONFIG.burnDamage} damage at the start of each turn.`,
  },
  blind: {
    id: 'blind',
    name: 'Blind',
    symbol: '◐',
    duration: 3,
    description: 'Attacks have an extra 50% chance to miss.',
  },
  freeze: {
    id: 'freeze',
    name: 'Freeze',
    symbol: '❄',
    duration: 1,
    description: 'Skips the next action.',
  },
  stun: {
    id: 'stun',
    name: 'Stun',
    symbol: '✷',
    duration: 1,
    description: 'Skips the next action.',
  },
});

export const DISABLING_STATUSES = ['freeze', 'stun'];

export const hasStatus = (actor, id) => actor.statuses.some((s) => s.id === id);
export const isImmune = (actor, id) => actor.immunities.some((i) => i.statusId === id);
export const isDisabled = (actor) => DISABLING_STATUSES.some((id) => hasStatus(actor, id));

/**
 * Final chance for a newly applied negative status: base → Enrage −10 points →
 * Crystallize ×0.5 → clamp to [0, 1].
 */
export function effectiveStatusChance(
  baseChance,
  { targetEnraged = false, targetCrystallized = false } = {},
  config = GAME_CONFIG,
) {
  let chance = baseChance;
  if (targetEnraged) chance -= config.enrageStatusResistancePoints / 100;
  if (targetCrystallized) chance *= config.crystallizeStatusChanceMultiplier;
  return clamp(chance, 0, 1);
}

/** Add a status without rolling. Caller must have checked eligibility. */
export function addStatus(actor, id, actorTurn) {
  actor.statuses.push({
    id,
    remainingAffectedTurns: STATUS_DEFS[id].duration,
    appliedAtActorTurn: actorTurn,
  });
}

/**
 * Attempt to inflict a negative status.
 * Already-affected or immune targets fail without a roll, and a target at 0 HP is ignored.
 * @returns {{ outcome: 'applied' | 'resisted' | 'immune' | 'already' | 'defeated', chance: number }}
 */
export function tryApplyStatus(target, id, baseChance, ctx, rng, config = GAME_CONFIG) {
  if (target.hp <= 0) return { outcome: 'defeated', chance: 0 };
  if (hasStatus(target, id)) return { outcome: 'already', chance: 0 };
  if (isImmune(target, id)) return { outcome: 'immune', chance: 0 };
  const chance = effectiveStatusChance(baseChance, ctx, config);
  if (!rollChance(chance, rng)) return { outcome: 'resisted', chance };
  addStatus(target, id, ctx.actorTurn ?? 0);
  return { outcome: 'applied', chance };
}

/** Grant one-complete-turn immunity for a status that just expired or was cured. */
function grantImmunity(actor, statusId, actorTurn) {
  if (isImmune(actor, statusId)) return;
  actor.immunities.push({ statusId, grantedAtActorTurn: actorTurn });
}

/**
 * Cure: remove every negative status immediately and grant immunity for each.
 * The immunity is granted on the current turn, so it is not counted at this turn's end.
 * @returns {string[]} removed status ids
 */
export function removeAllNegativeStatuses(actor, actorTurn) {
  const removed = actor.statuses.map((s) => s.id);
  actor.statuses = [];
  removed.forEach((id) => grantImmunity(actor, id, actorTurn));
  return removed;
}

/** Ids of statuses present at the start of the actor's turn. */
export function snapshotStatuses(actor) {
  return actor.statuses.map((s) => s.id);
}

/**
 * End-of-turn status processing for the actor who just took turn `actorTurn`.
 * 1. Immunities granted on an earlier turn have now protected one complete turn: remove them.
 * 2. Decrement statuses that were present at turn start; expired ones grant immunity
 *    (which survives this turn and lapses at the end of the actor's next turn).
 * @returns {string[]} ids of statuses that expired
 */
export function endTurnStatuses(actor, snapshot, actorTurn) {
  actor.immunities = actor.immunities.filter((i) => i.grantedAtActorTurn >= actorTurn);

  const expired = [];
  actor.statuses = actor.statuses.filter((status) => {
    if (!snapshot.includes(status.id)) return true;
    status.remainingAffectedTurns -= 1;
    if (status.remainingAffectedTurns > 0) return true;
    expired.push(status.id);
    return false;
  });
  expired.forEach((id) => grantImmunity(actor, id, actorTurn));
  return expired;
}
