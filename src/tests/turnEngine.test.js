import { describe, expect, it } from 'vitest';
import {
  createBattleState,
  getActionAvailability,
  performPlayerAction,
  runDragonTurn,
  startPlayerTurn,
  wizardCooldownRemaining,
} from '../game/turnEngine.js';
import { constantRng, scriptedRng } from './helpers.js';

// 0.5: every attack hits, mid-range damage, statuses resisted, dragon picks Fire Breath.
const neutral = constantRng(0.5);

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
  it('does not regenerate on the first turn, then +5 MP per later turn', () => {
    const state = newBattle();
    expect(state.wizard.mp).toBe(100);
    round(state, 'immolate'); // 100 - 12 = 88, then +5
    expect(state.wizard.mp).toBe(93);
  });

  it('Bash is always free and available', () => {
    const state = newBattle();
    state.wizard.mp = 0;
    expect(getActionAvailability(state, 'bash').available).toBe(true);
    expect(getActionAvailability(state, 'immolate').available).toBe(false);
  });

  it('limits potions to five and disables them at full MP', () => {
    const state = newBattle();
    expect(getActionAvailability(state, 'mana-potion').reason).toBe('Mana is already full.');
    state.wizard.mp = 80;
    performPlayerAction(state, 'mana-potion', neutral);
    expect(state.wizard.mp).toBe(100);
    expect(state.wizard.potionCount).toBe(4);
    expect(state.statistics.potionsUsed).toBe(1);
  });

  it('rejects invalid actions without changing state', () => {
    const state = newBattle();
    state.wizard.mp = 5;
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
  it('is unavailable for three following player turns, even after a miss', () => {
    const state = newBattle();
    performPlayerAction(state, 'arcanum', constantRng(0.01)); // miss
    expect(state.wizard.mp).toBe(70);
    expect(state.statistics.spellsCast.arcanum).toBe(1);
    runDragonTurn(state, neutral);

    for (const expected of [3, 2, 1]) {
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
  it('halves direct damage on the next dragon turn only', () => {
    const state = newBattle();
    // Dragon: weighted roll 0 → Claw; hit; damage roll 0.99 → 16 → halved to 8.
    round(state, 'crystallize', { dragon: scriptedRng([0, 0.5, 0.99], 0.5) });
    expect(state.wizard.hp).toBe(175 - 8);
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
    runDragonTurn(state, constantRng(0.01)); // dragon misses
    startPlayerTurn(state, neutral);
    expect(state.wizard.hp).toBe(175 - 8);
  });

  it('halves the chance of a new status', () => {
    const state = newBattle();
    performPlayerAction(state, 'crystallize', neutral);
    // Fire Breath (roll 0.5), hit, damage, burn roll 0.2: under 30% but not under 15%.
    runDragonTurn(state, scriptedRng([0.5, 0.5, 0.5, 0.2]));
    expect(state.wizard.statuses).toHaveLength(0);
  });
});

describe('Heal and Cure', () => {
  it('Heal tracks only HP actually restored and has no cooldown', () => {
    const state = newBattle();
    state.wizard.hp = 174;
    performPlayerAction(state, 'heal', neutral);
    expect(state.wizard.hp).toBe(175);
    expect(state.statistics.healingDone).toBe(1);
    expect(wizardCooldownRemaining(state, 'heal')).toBe(0);
  });

  it('Cure is castable with no statuses and still spends MP and the turn', () => {
    const state = newBattle();
    const result = performPlayerAction(state, 'cure', neutral);
    expect(result.ok).toBe(true);
    expect(state.wizard.mp).toBe(90);
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
    runDragonTurn(state, constantRng(0.01));
    expect(startPlayerTurn(state, neutral)).toBe('skipped');
    expect(state.wizard.mp).toBe(55);
    expect(state.statistics.playerTurnsTaken).toBe(2);
    expect(state.phase).toBe('dragonTurn');
    expect(state.wizard.immunities.map((i) => i.statusId)).toEqual(['stun']);
  });
});

describe('Fire Storm', () => {
  it('telegraphs, then must release next turn and enters cooldown', () => {
    const state = newBattle();
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, constantRng(0.95)); // picks Fire Storm
    expect(state.dragon.chargingFireStorm).toBe(true);
    expect(state.wizard.hp).toBe(175);
    expect(state.log.some((e) => e.type === 'firestorm-charge')).toBe(true);

    startPlayerTurn(state, neutral);
    performPlayerAction(state, 'crystallize', neutral);
    // Release on dragon turn 2: hit (0.5), damage roll 0.99 → 40 → 20; Burn roll 0.5 vs 30% → resisted.
    runDragonTurn(state, scriptedRng([0.5, 0.99, 0.5]));
    expect(state.dragon.chargingFireStorm).toBe(false);
    expect(state.wizard.hp).toBe(175 - 20);
    expect(state.dragon.cooldowns.fireStorm).toBe(2 + 3 + 1);
  });

  it('is interrupted by a successful Freeze and starts cooldown', () => {
    const state = newBattle();
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, constantRng(0.95));
    startPlayerTurn(state, neutral);
    // Blizzard: hit, damage, Freeze roll 0.1 < 25%.
    performPlayerAction(state, 'blizzard', scriptedRng([0.5, 0.5, 0.1]));
    expect(state.dragon.chargingFireStorm).toBe(false);
    expect(state.dragon.cooldowns.fireStorm).toBe(1 + 3 + 1);
    expect(state.log.some((e) => e.type === 'firestorm-interrupt')).toBe(true);
    runDragonTurn(state, neutral);
    expect(state.log.at(-2).type).toBe('skip');
  });

  it('is not interrupted by a resisted Freeze or a miss', () => {
    const state = newBattle();
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, constantRng(0.95));
    startPlayerTurn(state, neutral);
    performPlayerAction(state, 'blizzard', scriptedRng([0.5, 0.5, 0.9]));
    expect(state.dragon.chargingFireStorm).toBe(true);
  });

  it('is never boosted by Enrage', () => {
    const state = newBattle();
    state.dragon.chargingFireStorm = true;
    state.dragon.enrageAttacksRemaining = 3;
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, scriptedRng([0.5, 0.99, 0.9])); // 40 damage
    expect(state.wizard.hp).toBe(175 - 40);
    expect(state.dragon.enrageAttacksRemaining).toBe(3);
  });
});

describe('Enrage', () => {
  it('activates on the next eligible turn and boosts exactly three normal attacks', () => {
    const state = newBattle();
    state.dragon.hp = 263;
    // Bash: hit, damage roll 0 → 3 → HP 260, below 75%.
    performPlayerAction(state, 'bash', constantRng(0.1));
    expect(state.dragon.pendingEnrageUses).toBe(1);
    runDragonTurn(state, neutral);
    expect(state.dragon.enrageAttacksRemaining).toBe(3);
    expect(state.wizard.hp).toBe(175); // Enrage spends the whole turn

    const hpBefore = [];
    for (let i = 0; i < 3; i++) {
      startPlayerTurn(state, neutral);
      performPlayerAction(state, 'crystallize', neutral);
      hpBefore.push(state.wizard.hp);
      // Claw (0), hit (0.5), damage roll 0.99 → 16 × 1.5 × 0.5 = 12.
      runDragonTurn(state, scriptedRng([0, 0.5, 0.99]));
      expect(hpBefore[i] - state.wizard.hp).toBe(12);
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
    expect(state.dragon.enrageAttacksRemaining).toBe(3);
  });

  it('a miss still consumes an Enrage charge', () => {
    const state = newBattle();
    state.dragon.enrageAttacksRemaining = 3;
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, scriptedRng([0, 0.01])); // Claw, base miss
    expect(state.dragon.enrageAttacksRemaining).toBe(2);
  });

  it('reduces new status chances by 10 points while active', () => {
    const state = newBattle();
    state.dragon.enrageAttacksRemaining = 3;
    // Blizzard: hit, damage, Freeze roll 0.2 — under 25% but not under 15%.
    performPlayerAction(state, 'blizzard', scriptedRng([0.5, 0.5, 0.2]));
    expect(state.dragon.statuses).toHaveLength(0);
  });
});

describe('battle end', () => {
  it('a lethal direct hit ends the battle with no counterattack', () => {
    const state = newBattle();
    state.dragon.hp = 5;
    const result = performPlayerAction(state, 'immolate', scriptedRng([0.5, 0.5, 0]));
    expect(result.outcome).toBe('victory');
    expect(state.phase).toBe('finished');
    expect(state.winner).toBe('wizard');
    expect(state.dragon.statuses).toHaveLength(0); // no Burn on a dead dragon
    expect(state.statistics.damageDealt).toBe(5);
  });

  it('a lethal Burn tick on the dragon ends the battle before it acts', () => {
    const state = newBattle();
    state.dragon.hp = 6;
    state.dragon.chargingFireStorm = true;
    state.dragon.statuses.push({ id: 'burn', remainingAffectedTurns: 2, appliedAtActorTurn: 0 });
    performPlayerAction(state, 'crystallize', neutral);
    expect(runDragonTurn(state, neutral)).toBe('victory');
    expect(state.wizard.hp).toBe(175);
    expect(state.dragon.chargingFireStorm).toBe(false);
    expect(state.statistics.damageDealt).toBe(6);
  });

  it('a lethal Burn tick on the wizard ends the battle before any action', () => {
    const state = newBattle();
    performPlayerAction(state, 'bash', neutral);
    runDragonTurn(state, constantRng(0.01));
    state.wizard.hp = 4;
    state.wizard.statuses.push({ id: 'burn', remainingAffectedTurns: 3, appliedAtActorTurn: 1 });
    expect(startPlayerTurn(state, neutral)).toBe('defeat');
    expect(state.winner).toBe('dragon');
    expect(state.statistics.damageReceived).toBe(4);
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
    expect(s.damageDealt).toBe(350 - state.dragon.hp);
    expect(s.damageReceived - s.healingDone).toBe(175 - state.wizard.hp);
  });
});
