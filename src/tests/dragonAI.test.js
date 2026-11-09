import { describe, expect, it } from 'vitest';
import {
  checkEnrageThresholds,
  decideDragonAction,
  eligibleAttacks,
  selectWeightedAttack,
} from '../game/dragonAI.js';
import { createBattleState } from '../game/turnEngine.js';
import { constantRng, pickRoll } from './helpers.js';

const freshDragon = () => createBattleState().dragon;

describe('Enrage thresholds', () => {
  it('unlock strictly below 75/50/25% and only once each', () => {
    const dragon = freshDragon();
    const max = dragon.maxHp;
    dragon.hp = max * 0.75; // exactly 75%
    expect(checkEnrageThresholds(dragon)).toBe(0);
    dragon.hp = max * 0.75 - 0.5;
    expect(checkEnrageThresholds(dragon)).toBe(1);
    expect(checkEnrageThresholds(dragon)).toBe(0);
    dragon.hp = max * 0.5; // exactly 50%
    expect(checkEnrageThresholds(dragon)).toBe(0);
    dragon.hp = Math.floor(max * 0.25) - 1; // crosses 50% and 25% together
    expect(checkEnrageThresholds(dragon)).toBe(2);
    expect(dragon.pendingEnrageUses).toBe(3);
  });
});

describe('action priority', () => {
  it('skips when frozen or stunned', () => {
    const dragon = freshDragon();
    dragon.statuses.push({ id: 'freeze', remainingAffectedTurns: 1 });
    dragon.pendingEnrageUses = 1;
    expect(decideDragonAction(dragon, 1, constantRng(0)).type).toBe('skip');
  });

  it('releases a charged Fire Storm before a pending Enrage', () => {
    const dragon = freshDragon();
    dragon.chargingFireStorm = true;
    dragon.pendingEnrageUses = 1;
    expect(decideDragonAction(dragon, 1, constantRng(0)).type).toBe('releaseFireStorm');
  });

  it('activates pending Enrage before attacking, but not while already enraged', () => {
    const dragon = freshDragon();
    dragon.pendingEnrageUses = 1;
    expect(decideDragonAction(dragon, 1, constantRng(0)).type).toBe('enrage');
    dragon.enrageAttacksRemaining = 2;
    expect(decideDragonAction(dragon, 1, constantRng(0)).type).toBe('attack');
  });
});

describe('weighted attack selection', () => {
  it('picks each attack within its configured weight band', () => {
    const dragon = freshDragon();
    for (const id of ['claw', 'fireBreath', 'tailStrike', 'fireStorm']) {
      expect(selectWeightedAttack(dragon, 1, constantRng(pickRoll(id)))).toBe(id);
    }
  });

  it('excludes Fire Storm on cooldown or with pending Enrage, and renormalizes', () => {
    const dragon = freshDragon();
    dragon.cooldowns.fireStorm = 5;
    expect(eligibleAttacks(dragon, 4)).not.toContain('fireStorm');
    expect(eligibleAttacks(dragon, 5)).toContain('fireStorm');
    // With Fire Storm excluded, the remaining weights renormalize: the top roll is Tail Strike.
    expect(selectWeightedAttack(dragon, 4, constantRng(0.9999))).toBe('tailStrike');

    const angry = freshDragon();
    angry.pendingEnrageUses = 1;
    expect(eligibleAttacks(angry, 1)).not.toContain('fireStorm');
  });
});
