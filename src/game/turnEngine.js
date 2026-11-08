/**
 * Turn engine: pure, synchronous rules that mutate a plain battle-state object.
 * Every random decision goes through the injected `rng`, so tests are deterministic.
 * Animation and pacing live elsewhere and never influence outcomes.
 */
import { GAME_CONFIG } from './config.js';
import { SPELLS_BY_ID } from './spells.js';
import { DRAGON_ABILITIES } from './dragonAbilities.js';
import {
  applyDamage,
  applyHeal,
  calculateDamage,
  restoreMana,
  rollHit,
  rollInt,
} from './combat.js';
import {
  STATUS_DEFS,
  DISABLING_STATUSES,
  endTurnStatuses,
  hasStatus,
  isDisabled,
  removeAllNegativeStatuses,
  snapshotStatuses,
  tryApplyStatus,
} from './statusEffects.js';
import {
  checkEnrageThresholds,
  cooldownRemaining,
  decideDragonAction,
  isEnraged,
} from './dragonAI.js';

const WIZARD = 'Wizard';
const DRAGON = GAME_CONFIG.dragon.name;
const nameOf = (actorId) => (actorId === 'wizard' ? WIZARD : DRAGON);

export function createBattleState(config = GAME_CONFIG) {
  return {
    phase: 'idle', // idle | playerTurn | resolvingPlayer | dragonTurn | resolvingDragon | finished
    winner: null, // null | 'wizard' | 'dragon'
    round: 1,
    actorTurns: { wizard: 0, dragon: 0 },
    wizard: {
      id: 'wizard',
      hp: config.wizard.maxHp,
      maxHp: config.wizard.maxHp,
      mp: config.wizard.maxMp,
      maxMp: config.wizard.maxMp,
      potionCount: config.wizard.potions,
      statuses: [],
      immunities: [],
      cooldowns: {},
      turnSnapshot: [],
    },
    dragon: {
      id: 'dragon',
      hp: config.dragon.maxHp,
      maxHp: config.dragon.maxHp,
      statuses: [],
      immunities: [],
      cooldowns: {},
      turnSnapshot: [],
      enrageThresholdsUsed: config.dragon.enrageThresholds.map(() => false),
      pendingEnrageUses: 0,
      enrageAttacksRemaining: 0,
      chargingFireStorm: false,
    },
    crystallizeActiveForNextDragonTurn: false,
    log: [],
    nextEventId: 1,
    statistics: {
      playerTurnsTaken: 0,
      damageDealt: 0,
      damageReceived: 0,
      healingDone: 0,
      spellsCast: {},
      bashesUsed: 0,
      potionsUsed: 0,
    },
  };
}

/* ------------------------------------------------------------------ events */

function emit(state, actor, type, message, extra = {}) {
  const event = { id: state.nextEventId++, round: state.round, actor, type, message, ...extra };
  state.log.push(event);
  return event;
}

function finishBattle(state, winner) {
  state.winner = winner;
  state.phase = 'finished';
  state.dragon.chargingFireStorm = false;
  state.crystallizeActiveForNextDragonTurn = false;
  emit(
    state,
    winner,
    winner === 'wizard' ? 'victory' : 'defeat',
    winner === 'wizard' ? `${DRAGON} has been slain!` : `The ${WIZARD} has fallen.`,
  );
}

function logStatusAttempt(state, attacker, target, statusId, result) {
  const status = STATUS_DEFS[statusId].name;
  const who = nameOf(target);
  const base = { target, statusId };
  switch (result.outcome) {
    case 'applied':
      return emit(state, attacker, 'status-applied', `${who} is afflicted with ${status}!`, base);
    case 'immune':
      return emit(state, attacker, 'status-immune', `${who} is immune to ${status}.`, base);
    case 'already':
      return emit(
        state,
        attacker,
        'status-already',
        `${who} is already affected by ${status}.`,
        base,
      );
    case 'resisted':
      return emit(state, attacker, 'status-resisted', `${who} resists ${status}.`, base);
    default:
      return null;
  }
}

function logExpired(state, actorId, expired) {
  expired.forEach((statusId) =>
    emit(
      state,
      actorId,
      'status-expired',
      `${STATUS_DEFS[statusId].name} wears off ${nameOf(actorId)}. Immune for one turn.`,
      { target: actorId, statusId },
    ),
  );
}

/** Damage the dragon, track stats, and unlock Enrage thresholds. Returns actual damage. */
function damageDragon(state, amount) {
  const actual = applyDamage(state.dragon, amount);
  state.statistics.damageDealt += actual;
  if (checkEnrageThresholds(state.dragon) > 0) {
    emit(state, 'dragon', 'enrage-unlocked', `${DRAGON}'s fury is building…`);
  }
  return actual;
}

function damageWizard(state, amount) {
  const actual = applyDamage(state.wizard, amount);
  state.statistics.damageReceived += actual;
  return actual;
}

/** Fire Storm stops charging and enters cooldown counted from the dragon's latest turn. */
function interruptFireStorm(state) {
  const dragon = state.dragon;
  dragon.chargingFireStorm = false;
  dragon.cooldowns.fireStorm = state.actorTurns.dragon + DRAGON_ABILITIES.fireStorm.cooldown + 1;
  emit(state, 'dragon', 'firestorm-interrupt', `${DRAGON}'s Fire Storm is interrupted!`);
}

/* ----------------------------------------------------------- availability */

/** Cooldown turns remaining for a wizard ability, as of the wizard's next opportunity. */
export function wizardCooldownRemaining(state, actionId) {
  const turn = state.actorTurns.wizard + (state.phase === 'playerTurn' ? 0 : 1);
  return cooldownRemaining(state.wizard.cooldowns, actionId, turn);
}

/**
 * Whether the wizard may take an action right now, with a player-facing reason if not.
 * The store re-validates with this regardless of button state.
 */
export function getActionAvailability(state, actionId, config = GAME_CONFIG) {
  const spell = SPELLS_BY_ID[actionId];
  if (!spell) return { available: false, reason: 'Unknown action.' };
  const wizard = state.wizard;
  const notYourTurn = state.phase !== 'playerTurn';

  let reason = null;
  if (wizard.mp < spell.mpCost) reason = `Not enough mana (needs ${spell.mpCost} MP).`;
  const cd = wizardCooldownRemaining(state, actionId);
  if (cd > 0) reason = `Recharging: ${cd} turn${cd === 1 ? '' : 's'}.`;
  if (spell.kind === 'item') {
    if (wizard.potionCount <= 0) reason = 'No potions left.';
    else if (config.disablePotionAtFullMp && wizard.mp >= wizard.maxMp)
      reason = 'Mana is already full.';
  }
  if (!reason && notYourTurn)
    reason = state.phase === 'finished' ? 'Battle is over.' : 'Not your turn.';
  if (!reason && isDisabled(wizard)) reason = 'You cannot act this turn.';
  return { available: !reason, reason };
}

/* ------------------------------------------------------------- wizard turn */

/**
 * Begin the wizard's turn: regenerate mana (not on the first turn), tick Burn,
 * then skip the turn if Frozen/Stunned.
 * @returns {'ready' | 'skipped' | 'defeat'}
 */
export function startPlayerTurn(state, rng, config = GAME_CONFIG) {
  const wizard = state.wizard;
  state.actorTurns.wizard += 1;
  const turn = state.actorTurns.wizard;
  state.round = turn;

  if (turn > 1) {
    const regen = restoreMana(wizard, config.wizard.manaRegen);
    if (regen > 0)
      emit(state, 'wizard', 'mana-regen', `The ${WIZARD} regains ${regen} MP.`, {
        target: 'wizard',
        amount: regen,
      });
  }

  wizard.turnSnapshot = snapshotStatuses(wizard);

  if (wizard.turnSnapshot.includes('burn')) {
    const dealt = damageWizard(state, config.burnDamage);
    emit(state, 'dragon', 'burn-tick', `Burn deals ${dealt} damage to the ${WIZARD}.`, {
      target: 'wizard',
      amount: dealt,
    });
    if (wizard.hp <= 0) {
      finishBattle(state, 'dragon');
      return 'defeat';
    }
  }

  if (isDisabled(wizard)) {
    const cause = DISABLING_STATUSES.filter((id) => hasStatus(wizard, id))
      .map((id) => STATUS_DEFS[id].name)
      .join(' and ');
    state.statistics.playerTurnsTaken += 1;
    emit(
      state,
      'wizard',
      'skip',
      `The ${WIZARD} is ${cause === 'Stun' ? 'stunned' : 'frozen'} and loses the turn.`,
      {
        target: 'wizard',
      },
    );
    completeWizardTurn(state);
    state.phase = 'dragonTurn';
    return 'skipped';
  }

  state.phase = 'playerTurn';
  return 'ready';
}

function completeWizardTurn(state) {
  const expired = endTurnStatuses(state.wizard, state.wizard.turnSnapshot, state.actorTurns.wizard);
  logExpired(state, 'wizard', expired);
}

/**
 * Resolve one wizard action. Invalid actions change nothing.
 * @returns {{ ok: boolean, reason?: string, outcome?: 'continue' | 'victory' }}
 */
export function performPlayerAction(state, actionId, rng, config = GAME_CONFIG) {
  const check = getActionAvailability(state, actionId, config);
  if (!check.available) return { ok: false, reason: check.reason };

  const spell = SPELLS_BY_ID[actionId];
  const { wizard, dragon, statistics } = state;
  const turn = state.actorTurns.wizard;

  state.phase = 'resolvingPlayer';
  statistics.playerTurnsTaken += 1;
  wizard.mp -= spell.mpCost;
  if (spell.cooldown) wizard.cooldowns[spell.id] = turn + spell.cooldown + 1;
  if (spell.countsAsSpell)
    statistics.spellsCast[spell.id] = (statistics.spellsCast[spell.id] ?? 0) + 1;
  if (spell.id === 'bash') statistics.bashesUsed += 1;

  switch (spell.kind) {
    case 'attack':
      resolveWizardAttack(state, spell, rng, config);
      break;
    case 'support':
      resolveSupport(state, spell, rng);
      break;
    case 'item': {
      wizard.potionCount -= 1;
      statistics.potionsUsed += 1;
      const restored = restoreMana(wizard, spell.restoreMp);
      emit(
        state,
        'wizard',
        'mana',
        `The ${WIZARD} drinks a Mana Potion and restores ${restored} MP.`,
        {
          action: spell.id,
          target: 'wizard',
          amount: restored,
        },
      );
      break;
    }
  }

  if (dragon.hp <= 0) {
    if (state.phase !== 'finished') finishBattle(state, 'wizard');
    return { ok: true, outcome: 'victory' };
  }

  completeWizardTurn(state);
  state.phase = 'dragonTurn';
  return { ok: true, outcome: 'continue' };
}

function resolveWizardAttack(state, spell, rng, config) {
  const { wizard, dragon } = state;
  const hit = rollHit({ blinded: hasStatus(wizard, 'blind') }, rng, config);
  if (!hit.hit) {
    emit(
      state,
      'wizard',
      'miss',
      `${spell.name} misses${hit.reason === 'blind' ? ' (Blind)' : ''}.`,
      {
        action: spell.id,
        target: 'dragon',
      },
    );
    return;
  }

  const dealt = damageDragon(state, calculateDamage(rollInt(...spell.damage, rng), {}, config));
  emit(state, 'wizard', 'damage', `${spell.name} deals ${dealt} damage to ${DRAGON}.`, {
    action: spell.id,
    target: 'dragon',
    amount: dealt,
  });

  if (dragon.hp <= 0) {
    finishBattle(state, 'wizard');
    return;
  }

  if (spell.status) {
    const result = tryApplyStatus(
      dragon,
      spell.status.id,
      spell.status.chance,
      { targetEnraged: isEnraged(dragon), actorTurn: state.actorTurns.dragon },
      rng,
      config,
    );
    logStatusAttempt(state, 'wizard', 'dragon', spell.status.id, result);
    if (
      result.outcome === 'applied' &&
      DISABLING_STATUSES.includes(spell.status.id) &&
      dragon.chargingFireStorm
    ) {
      interruptFireStorm(state);
    }
  }
}

function resolveSupport(state, spell, rng) {
  const wizard = state.wizard;
  if (spell.id === 'crystallize') {
    state.crystallizeActiveForNextDragonTurn = true;
    emit(state, 'wizard', 'crystallize', `The ${WIZARD} is encased in protective crystal.`, {
      action: spell.id,
      target: 'wizard',
    });
  } else if (spell.id === 'heal') {
    const healed = applyHeal(wizard, rollInt(...spell.heal, rng));
    state.statistics.healingDone += healed;
    emit(state, 'wizard', 'heal', `Heal restores ${healed} HP.`, {
      action: spell.id,
      target: 'wizard',
      amount: healed,
    });
  } else if (spell.id === 'cure') {
    const removed = removeAllNegativeStatuses(wizard, state.actorTurns.wizard);
    const message = removed.length
      ? `Cure removes ${removed.map((id) => STATUS_DEFS[id].name).join(', ')}. Immune for one turn.`
      : 'Cure is cast, but there was nothing to cure.';
    emit(state, 'wizard', 'cure', message, { action: spell.id, target: 'wizard', removed });
  }
}

/* ------------------------------------------------------------- dragon turn */

/**
 * Run the dragon's whole turn synchronously.
 * @returns {'continue' | 'victory' | 'defeat'}
 */
export function runDragonTurn(state, rng, config = GAME_CONFIG) {
  const { dragon } = state;
  state.phase = 'resolvingDragon';
  state.actorTurns.dragon += 1;
  const turn = state.actorTurns.dragon;

  dragon.turnSnapshot = snapshotStatuses(dragon);

  if (dragon.turnSnapshot.includes('burn')) {
    const dealt = damageDragon(state, config.burnDamage);
    emit(state, 'wizard', 'burn-tick', `Burn deals ${dealt} damage to ${DRAGON}.`, {
      target: 'dragon',
      amount: dealt,
    });
    if (dragon.hp <= 0) {
      finishBattle(state, 'wizard');
      return 'victory';
    }
  }

  const decision = decideDragonAction(dragon, turn, rng);
  switch (decision.type) {
    case 'skip': {
      if (dragon.chargingFireStorm) interruptFireStorm(state);
      const frozen = hasStatus(dragon, 'freeze');
      emit(
        state,
        'dragon',
        'skip',
        `${DRAGON} is ${frozen ? 'frozen solid' : 'stunned'} and cannot act.`,
        {
          target: 'dragon',
        },
      );
      break;
    }
    case 'releaseFireStorm':
      dragon.chargingFireStorm = false;
      dragon.cooldowns.fireStorm = turn + DRAGON_ABILITIES.fireStorm.cooldown + 1;
      resolveDragonAttack(state, DRAGON_ABILITIES.fireStorm, rng, config);
      break;
    case 'enrage':
      dragon.pendingEnrageUses -= 1;
      dragon.enrageAttacksRemaining = config.enrageAttackCharges;
      emit(
        state,
        'dragon',
        'enrage',
        `${DRAGON} becomes Enraged! Its next ${config.enrageAttackCharges} attacks hit harder.`,
      );
      break;
    case 'attack':
      if (decision.attackId === 'fireStorm') {
        dragon.chargingFireStorm = true;
        emit(state, 'dragon', 'firestorm-charge', `${DRAGON} is preparing Fire Storm!`);
      } else {
        resolveDragonAttack(state, DRAGON_ABILITIES[decision.attackId], rng, config);
      }
      break;
  }

  if (state.wizard.hp <= 0) {
    if (state.phase !== 'finished') finishBattle(state, 'dragon');
    return 'defeat';
  }

  logExpired(state, 'dragon', endTurnStatuses(dragon, dragon.turnSnapshot, turn));
  state.crystallizeActiveForNextDragonTurn = false;
  return 'continue';
}

function resolveDragonAttack(state, ability, rng, config) {
  const { dragon, wizard } = state;
  const enraged = ability.normal && isEnraged(dragon);
  const crystallized = state.crystallizeActiveForNextDragonTurn;
  const hit = rollHit({ blinded: hasStatus(dragon, 'blind') }, rng, config);

  if (!hit.hit) {
    emit(
      state,
      'dragon',
      'miss',
      `${DRAGON}'s ${ability.name} misses${hit.reason === 'blind' ? ' (Blind)' : ''}.`,
      {
        action: ability.id,
        target: 'wizard',
      },
    );
  } else {
    const dealt = damageWizard(
      state,
      calculateDamage(rollInt(...ability.damage, rng), { enraged, crystallized }, config),
    );
    const notes = [enraged && 'enraged', crystallized && 'crystal-shielded'].filter(Boolean);
    emit(
      state,
      'dragon',
      'damage',
      `${DRAGON}'s ${ability.name} deals ${dealt} damage${notes.length ? ` (${notes.join(', ')})` : ''}.`,
      { action: ability.id, target: 'wizard', amount: dealt, heavy: ability.id === 'fireStorm' },
    );

    if (wizard.hp <= 0) {
      finishBattle(state, 'dragon');
    } else if (ability.status) {
      const result = tryApplyStatus(
        wizard,
        ability.status.id,
        ability.status.chance,
        { targetCrystallized: crystallized, actorTurn: state.actorTurns.wizard },
        rng,
        config,
      );
      logStatusAttempt(state, 'dragon', 'wizard', ability.status.id, result);
    }
  }

  if (enraged) {
    dragon.enrageAttacksRemaining -= 1;
    if (dragon.enrageAttacksRemaining === 0 && state.phase !== 'finished') {
      emit(state, 'dragon', 'enrage-end', `${DRAGON}'s rage subsides.`);
    }
  }
}
