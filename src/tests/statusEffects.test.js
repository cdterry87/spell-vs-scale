import { describe, expect, it } from 'vitest';
import {
  effectiveStatusChance,
  endTurnStatuses,
  hasStatus,
  isImmune,
  removeAllNegativeStatuses,
  snapshotStatuses,
  tryApplyStatus,
} from '../game/statusEffects.js';
import { constantRng } from './helpers.js';

const actor = () => ({ hp: 100, statuses: [], immunities: [] });
const always = constantRng(0);
const never = constantRng(0.999);

/** Simulate one full turn for the actor: snapshot at start, process at end. */
function takeTurn(a, turn) {
  const snap = snapshotStatuses(a);
  return endTurnStatuses(a, snap, turn);
}

describe('status application', () => {
  it('applies on a successful roll and never stacks or refreshes', () => {
    const a = actor();
    expect(tryApplyStatus(a, 'burn', 0.35, {}, always).outcome).toBe('applied');
    a.statuses[0].remainingAffectedTurns = 1;
    expect(tryApplyStatus(a, 'burn', 0.35, {}, always).outcome).toBe('already');
    expect(a.statuses).toHaveLength(1);
    expect(a.statuses[0].remainingAffectedTurns).toBe(1);
  });

  it('lets different statuses coexist', () => {
    const a = actor();
    tryApplyStatus(a, 'burn', 1, {}, always);
    tryApplyStatus(a, 'blind', 1, {}, always);
    tryApplyStatus(a, 'freeze', 1, {}, always);
    expect(a.statuses.map((s) => s.id)).toEqual(['burn', 'blind', 'freeze']);
  });

  it('reports a resisted roll separately', () => {
    expect(tryApplyStatus(actor(), 'burn', 0.35, {}, never).outcome).toBe('resisted');
  });

  it('suppresses application to a defeated target', () => {
    const a = actor();
    a.hp = 0;
    expect(tryApplyStatus(a, 'burn', 1, {}, always).outcome).toBe('defeated');
    expect(a.statuses).toHaveLength(0);
  });

  it('applies Enrage −10 points, Crystallize ×0.5, and clamps', () => {
    expect(effectiveStatusChance(0.25, { targetEnraged: true })).toBeCloseTo(0.15);
    expect(effectiveStatusChance(0.35, { targetEnraged: true })).toBeCloseTo(0.25);
    expect(effectiveStatusChance(0.6, { targetCrystallized: true })).toBeCloseTo(0.3);
    expect(effectiveStatusChance(0.3, { targetCrystallized: true })).toBeCloseTo(0.15);
    expect(effectiveStatusChance(0.05, { targetEnraged: true })).toBe(0);
  });
});

describe('status lifecycle', () => {
  it('Burn lasts exactly three affected turns, then grants immunity', () => {
    const a = actor();
    tryApplyStatus(a, 'burn', 1, {}, always); // applied during the opponent's turn
    expect(takeTurn(a, 1)).toEqual([]);
    expect(takeTurn(a, 2)).toEqual([]);
    expect(takeTurn(a, 3)).toEqual(['burn']);
    expect(hasStatus(a, 'burn')).toBe(false);
    expect(isImmune(a, 'burn')).toBe(true);
  });

  it('does not decrement a status applied during the actor’s own turn', () => {
    const a = actor();
    const snap = snapshotStatuses(a); // empty at turn start
    tryApplyStatus(a, 'burn', 1, {}, always);
    endTurnStatuses(a, snap, 1);
    expect(a.statuses[0].remainingAffectedTurns).toBe(3);
  });

  it('immunity covers one complete following turn (Freeze example from the spec)', () => {
    const dragon = actor();
    // Player turn 3: Blizzard freezes the dragon.
    tryApplyStatus(dragon, 'freeze', 1, {}, always);
    // Dragon turn 3: skips, Freeze expires, immunity granted.
    expect(takeTurn(dragon, 3)).toEqual(['freeze']);
    // Player turn 4: repeat Freeze is blocked.
    expect(tryApplyStatus(dragon, 'freeze', 1, {}, always).outcome).toBe('immune');
    // Dragon turn 4 completes with immunity, which then lapses.
    takeTurn(dragon, 4);
    expect(isImmune(dragon, 'freeze')).toBe(false);
    // Player turn 5: Freeze can apply again.
    expect(tryApplyStatus(dragon, 'freeze', 1, {}, always).outcome).toBe('applied');
  });

  it('immunity is per status; other statuses can still apply', () => {
    const a = actor();
    tryApplyStatus(a, 'burn', 1, {}, always);
    takeTurn(a, 1);
    takeTurn(a, 2);
    takeTurn(a, 3);
    expect(tryApplyStatus(a, 'burn', 1, {}, always).outcome).toBe('immune');
    expect(tryApplyStatus(a, 'stun', 1, {}, always).outcome).toBe('applied');
  });

  it('Cure removes everything and grants immunity that survives the current turn', () => {
    const a = actor();
    tryApplyStatus(a, 'burn', 1, {}, always);
    tryApplyStatus(a, 'blind', 1, {}, always);
    const snap = snapshotStatuses(a);
    expect(removeAllNegativeStatuses(a, 5)).toEqual(['burn', 'blind']);
    endTurnStatuses(a, snap, 5); // end of the turn Cure was cast
    expect(isImmune(a, 'burn')).toBe(true);
    expect(isImmune(a, 'blind')).toBe(true);
    takeTurn(a, 6); // next full turn
    expect(isImmune(a, 'burn')).toBe(false);
  });
});
