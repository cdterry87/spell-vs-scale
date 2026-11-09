/**
 * Turn-engine rules. Expected numbers are derived from the balance config and ability data,
 * so tuning values in src/game never breaks these tests; only rule changes do.
 */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG as C } from '../game/config.js';
import { SPELLS_BY_ID as S } from '../game/spells.js';
import { DRAGON_ABILITIES as D } from '../game/dragonAbilities.js';
import {
  createBattleState,
  getActionAvailability,
  performPlayerAction,
  runDragonTurn,
  startPlayerTurn,
  wizardCooldownRemaining,
} from '../game/turnEngine.js';
import { MAX_ROLL, between, constantRng, pickRoll, scriptedRng } from './helpers.js';

const W = C.wizard;
const HIT = 0.5; // passes the base miss check
const MISS = 0.01; // fails the base miss check
const RESIST = 0.99; // fails any status roll below 99%

// Every attack hits with mid-range damage, statuses are resisted, and the dragon picks a
// normal attack. Assumes no status chance is 50% or higher on these paths.
const neutral = constantRng(0.5);
const dragonPicks = (id, ...rest) => scriptedRng([pickRoll(id), ...rest]);

function newBattle() {
  const state = createBattleState();
  startPlayerTurn(state, neutral);
  return state;
}

/** Play a wizard action and a full dragon turn, then begin the next player turn. */
function round(state, actionId, { player = neutral, dragon = neutral } = {}) {
  const result = performPlayerAction(state, actionId, player);
  if (state.phase !== 'finished') runDragonTurn(state, dragon);
  if (state.phase !== 'finished') startPlayerTurn(state, neutral);
  return result;
}

describe('resources', () => {
  it('does not regenerate on the first turn, then regenerates each later turn', () => {
    const state = newBattle();
    expect(state.wizard.mp).toBe(W.maxMp);
    round(state, 'immolate');
    expect(state.wizard.mp).toBe(Math.min(W.maxMp, W.maxMp - S.immolate.mpCost + W.manaRegen));
  });

  it('Bash is always free and available', () => {
    const state = newBattle();
    state.wizard.mp = 0;
    expect(S.bash.mpCost).toBe(0);
    expect(getActionAvailability(state, 'bash').available).toBe(true);
    expect(getActionAvailability(state, 'immolate').available).toBe(false);
  });

  it('limits potions to the configured count, caps MP, and disables them at full MP', () => {
    const state = newBattle();
    expect(getActionAvailability(state, 'mana-potion').reason).toBe('Mana is already full.');
    state.wizard.mp = W.maxMp - Math.floor(W.potionRestore / 2);
    performPlayerAction(state, 'mana-potion', neutral);
    expect(state.wizard.mp).toBe(W.maxMp);
    expect(state.wizard.potionCount).toBe(W.potions - 1);
    expect(state.statistics.potionsUsed).toBe(1);
  });

  it('rejects invalid actions without changing state', () => {
    const state = newBattle();
    state.wizard.mp = S.arcanum.mpCost - 1;
    const before = JSON.stringify(state);
    expect(performPlayerAction(state, 'arcanum', neutral).ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('blocks actions outside the player turn', () => {
    const state = newBattle();
    performPlayerAction(state, 'bash', neutral);
    expect(performPlayerAction(state, 'bash', neutral).ok).toBe(false);
  });
});

describe('Arcanum cooldown', () => {
  it('is unavailable for the configured number of following turns, even after a miss', () => {
    const state = newBattle();
    performPlayerAction(state, 'arcanum', constantRng(MISS));
    expect(state.wizard.mp).toBe(W.maxMp - S.arcanum.mpCost);
    expect(state.statistics.spellsCast.arcanum).toBe(1);
    runDragonTurn(state, neutral);

    for (let expected = C.arcanumCooldown; expected > 0; expected--) {
      startPlayerTurn(state, neutral);
      expect(wizardCooldownRemaining(state, 'arcanum')).toBe(expected);
      expect(getActionAvailability(state, 'arcanum').available).toBe(false);
      performPlayerAction(state, 'bash', neutral);
      runDragonTurn(state, neutral);
    }
    startPlayerTurn(state, neutral);
    expect(getActionAvailability(state, 'arcanum').available).toBe(true);
  });
});

describe('Crystallize', () => {
  it('reduces direct damage on the next dragon turn only', () => {
    const state = newBattle();
    round(state, 'crystallize', { dragon: dragonPicks('claw', HIT, MAX_ROLL) });
    const expected = Math.round(D.claw.damage[1] * C.crystallizeDamageMultiplier);
    expect(state.wizard.hp).toBe(W.maxHp - expected);
    expect(state.crystallizeActiveForNextDragonTurn).toBe(false);
  });

  it('expires even when the dragon skips its turn', () => {
    const state = newBattle();
    state.dragon.statuses.push({ id: 'stun', remainingAffectedTurns: 1, appliedAtActorTurn: 0 });
    performPlayerAction(state, 'crystallize', neutral);
    expect(state.crystallizeActiveForNextDragonTurn).toBe(true);
    runDragonTurn(state, neutral);
    expect(state.crystallizeActiveForNextDragonTurn).toBe(false);
  });

  it('does not reduce an existing Burn tick', () => {
    const state = newBattle();
    state.wizard.statuses.push({ id: 'burn', remainingAffectedTurns: 3, appliedAtActorTurn: 0 });
    state.crystallizeActiveForNextDragonTurn = true;
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, constantRng(MISS)); // dragon misses
    startPlayerTurn(state, neutral);
    expect(state.wizard.hp).toBe(W.maxHp - C.burnDamage);
  });

  it('reduces the chance of a new status', () => {
    const state = newBattle();
    performPlayerAction(state, 'crystallize', neutral);
    const base = D.fireBreath.status.chance;
    const roll = between(base * C.crystallizeStatusChanceMultiplier, base);
    runDragonTurn(state, dragonPicks('fireBreath', HIT, 0.5, roll));
    expect(state.wizard.statuses).toHaveLength(0);
  });
});

describe('Heal and Cure', () => {
  it('Heal tracks only HP actually restored and has no cooldown', () => {
    const state = newBattle();
    state.wizard.hp = W.maxHp - 1;
    performPlayerAction(state, 'heal', neutral);
    expect(state.wizard.hp).toBe(W.maxHp);
    expect(state.statistics.healingDone).toBe(1);
    expect(wizardCooldownRemaining(state, 'heal')).toBe(0);
  });

  it('Cure is castable with no statuses and still spends MP and the turn', () => {
    const state = newBattle();
    const result = performPlayerAction(state, 'cure', neutral);
    expect(result.ok).toBe(true);
    expect(state.wizard.mp).toBe(W.maxMp - S.cure.mpCost);
    expect(state.phase).toBe('dragonTurn');
    expect(state.log.at(-1).message).toMatch(/nothing to cure/);
  });
});

describe('skipped turns', () => {
  it('a stunned wizard regenerates mana, loses the turn, and it counts as a turn taken', () => {
    const state = newBattle();
    state.wizard.mp = 50;
    performPlayerAction(state, 'bash', neutral);
    state.wizard.statuses.push({ id: 'stun', remainingAffectedTurns: 1, appliedAtActorTurn: 1 });
    runDragonTurn(state, constantRng(MISS));
    expect(startPlayerTurn(state, neutral)).toBe('skipped');
    expect(state.wizard.mp).toBe(Math.min(W.maxMp, 50 + W.manaRegen));
    expect(state.statistics.playerTurnsTaken).toBe(2);
    expect(state.phase).toBe('dragonTurn');
    expect(state.wizard.immunities.map((i) => i.statusId)).toEqual(['stun']);
  });
});

describe('Fire Storm', () => {
  it('telegraphs, then must release next turn and enters cooldown', () => {
    const state = newBattle();
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, dragonPicks('fireStorm'));
    expect(state.dragon.chargingFireStorm).toBe(true);
    expect(state.wizard.hp).toBe(W.maxHp);
    expect(state.log.some((e) => e.type === 'firestorm-charge')).toBe(true);

    startPlayerTurn(state, neutral);
    performPlayerAction(state, 'crystallize', neutral);
    // Release on dragon turn 2: hit, max damage reduced by Crystallize, Burn resisted.
    runDragonTurn(state, scriptedRng([HIT, MAX_ROLL, RESIST]));
    expect(state.dragon.chargingFireStorm).toBe(false);
    const expected = Math.round(D.fireStorm.damage[1] * C.crystallizeDamageMultiplier);
    expect(state.wizard.hp).toBe(W.maxHp - expected);
    expect(state.dragon.cooldowns.fireStorm).toBe(2 + C.fireStormCooldown + 1);
  });

  it('is interrupted by a successful Freeze and starts cooldown', () => {
    const state = newBattle();
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, dragonPicks('fireStorm'));
    startPlayerTurn(state, neutral);
    performPlayerAction(state, 'blizzard', scriptedRng([HIT, 0.5, S.blizzard.status.chance / 2]));
    expect(state.dragon.chargingFireStorm).toBe(false);
    expect(state.dragon.cooldowns.fireStorm).toBe(1 + C.fireStormCooldown + 1);
    expect(state.log.some((e) => e.type === 'firestorm-interrupt')).toBe(true);
    runDragonTurn(state, neutral);
    expect(state.log.at(-2).type).toBe('skip');
  });

  it('is not interrupted by a resisted Freeze or a miss', () => {
    const state = newBattle();
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, dragonPicks('fireStorm'));
    startPlayerTurn(state, neutral);
    performPlayerAction(state, 'blizzard', scriptedRng([HIT, 0.5, RESIST]));
    expect(state.dragon.chargingFireStorm).toBe(true);
  });

  it('is never boosted by Enrage', () => {
    const state = newBattle();
    state.dragon.chargingFireStorm = true;
    state.dragon.enrageAttacksRemaining = C.enrageAttackCharges;
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, scriptedRng([HIT, MAX_ROLL, RESIST]));
    expect(state.wizard.hp).toBe(W.maxHp - D.fireStorm.damage[1]);
    expect(state.dragon.enrageAttacksRemaining).toBe(C.enrageAttackCharges);
  });
});

describe('Enrage', () => {
  it('activates on the next eligible turn and boosts exactly its configured attacks', () => {
    const state = newBattle();
    // Just above 75%; Bash's minimum damage pushes it below.
    state.dragon.hp = Math.floor(state.dragon.maxHp * C.dragon.enrageThresholds[0]) + 1;
    performPlayerAction(state, 'bash', scriptedRng([HIT, 0]));
    expect(state.dragon.pendingEnrageUses).toBe(1);
    runDragonTurn(state, neutral);
    expect(state.dragon.enrageAttacksRemaining).toBe(C.enrageAttackCharges);
    expect(state.wizard.hp).toBe(W.maxHp); // Enrage spends the whole turn

    const expected = Math.round(
      D.claw.damage[1] * C.enrageDamageMultiplier * C.crystallizeDamageMultiplier,
    );
    for (let i = 0; i < C.enrageAttackCharges; i++) {
      startPlayerTurn(state, neutral);
      state.wizard.hp = W.maxHp; // keep the wizard alive whatever the balance
      performPlayerAction(state, 'crystallize', neutral);
      runDragonTurn(state, dragonPicks('claw', HIT, MAX_ROLL));
      expect(W.maxHp - state.wizard.hp).toBe(expected);
    }
    expect(state.dragon.enrageAttacksRemaining).toBe(0);
  });

  it('waits while the dragon is frozen', () => {
    const state = newBattle();
    state.dragon.pendingEnrageUses = 1;
    state.dragon.statuses.push({ id: 'freeze', remainingAffectedTurns: 1, appliedAtActorTurn: 0 });
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, neutral);
    expect(state.dragon.pendingEnrageUses).toBe(1);
    startPlayerTurn(state, neutral);
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, neutral);
    expect(state.dragon.pendingEnrageUses).toBe(0);
    expect(state.dragon.enrageAttacksRemaining).toBe(C.enrageAttackCharges);
  });

  it('a miss still consumes an Enrage charge', () => {
    const state = newBattle();
    state.dragon.enrageAttacksRemaining = C.enrageAttackCharges;
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, dragonPicks('claw', MISS));
    expect(state.dragon.enrageAttacksRemaining).toBe(C.enrageAttackCharges - 1);
  });

  it('reduces new status chances by the configured points while active', () => {
    const state = newBattle();
    state.dragon.enrageAttacksRemaining = C.enrageAttackCharges;
    const base = S.blizzard.status.chance;
    const roll = between(Math.max(0, base - C.enrageStatusResistancePoints / 100), base);
    performPlayerAction(state, 'blizzard', scriptedRng([HIT, 0.5, roll]));
    expect(state.dragon.statuses).toHaveLength(0);
  });
});

describe('battle end', () => {
  it('a lethal direct hit ends the battle with no counterattack', () => {
    const state = newBattle();
    state.dragon.hp = 5;
    const result = performPlayerAction(state, 'immolate', scriptedRng([HIT, 0.5, 0]));
    expect(result.outcome).toBe('victory');
    expect(state.phase).toBe('finished');
    expect(state.winner).toBe('wizard');
    expect(state.dragon.statuses).toHaveLength(0); // no Burn on a dead dragon
    expect(state.statistics.damageDealt).toBe(5);
  });

  it('a lethal Burn tick on the dragon ends the battle before it acts', () => {
    const state = newBattle();
    state.dragon.hp = 1;
    state.dragon.chargingFireStorm = true;
    state.dragon.statuses.push({ id: 'burn', remainingAffectedTurns: 2, appliedAtActorTurn: 0 });
    performPlayerAction(state, 'crystallize', neutral);
    expect(runDragonTurn(state, neutral)).toBe('victory');
    expect(state.wizard.hp).toBe(W.maxHp);
    expect(state.dragon.chargingFireStorm).toBe(false);
    expect(state.statistics.damageDealt).toBe(1);
  });

  it('a lethal Burn tick on the wizard ends the battle before any action', () => {
    const state = newBattle();
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, constantRng(MISS));
    state.wizard.hp = 1;
    state.wizard.statuses.push({ id: 'burn', remainingAffectedTurns: 3, appliedAtActorTurn: 1 });
    expect(startPlayerTurn(state, neutral)).toBe('defeat');
    expect(state.winner).toBe('dragon');
    expect(state.statistics.damageReceived).toBe(1);
    expect(getActionAvailability(state, 'bash').available).toBe(false);
  });
});

describe('statistics', () => {
  it('counts turns, spells, bashes and capped damage', () => {
    const state = newBattle();
    round(state, 'immolate');
    round(state, 'bash');
    round(state, 'heal');
    const s = state.statistics;
    expect(s.playerTurnsTaken).toBe(3);
    expect(s.spellsCast).toEqual({ immolate: 1, heal: 1 });
    expect(s.bashesUsed).toBe(1);
    expect(s.damageDealt).toBe(state.dragon.maxHp - state.dragon.hp);
    expect(s.damageReceived - s.healingDone).toBe(W.maxHp - state.wizard.hp);
  });
});
