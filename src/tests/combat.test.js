import { describe, expect, it } from 'vitest';
import {
  applyDamage,
  applyHeal,
  calculateDamage,
  createRng,
  missChance,
  restoreMana,
  rollHit,
  rollInt,
} from '../game/combat.js';
import { scriptedRng, constantRng } from './helpers.js';

// Formula tests pin their own multipliers so they keep testing the rule, not the balance.
const RULES = {
  baseMissChance: 0.05,
  blindMissChance: 0.5,
  enrageDamageMultiplier: 1.5,
  crystallizeDamageMultiplier: 0.5,
};

describe('random damage', () => {
  it('rolls inclusive integer ranges', () => {
    expect(rollInt(3, 6, constantRng(0))).toBe(3);
    expect(rollInt(3, 6, constantRng(0.9999))).toBe(6);
    const rng = createRng(42);
    for (let i = 0; i < 2000; i++) {
      const v = rollInt(12, 18, rng);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(12);
      expect(v).toBeLessThanOrEqual(18);
    }
  });

  it('applies Enrage then Crystallize and rounds once', () => {
    expect(calculateDamage(15, {}, RULES)).toBe(15);
    expect(calculateDamage(15, { enraged: true }, RULES)).toBe(23); // 22.5 → 23
    expect(calculateDamage(15, { crystallized: true }, RULES)).toBe(8); // 7.5 → 8
    expect(calculateDamage(15, { enraged: true, crystallized: true }, RULES)).toBe(11); // 11.25 → 11
  });
});

describe('accuracy', () => {
  it('misses on the base 5% check', () => {
    expect(rollHit({}, scriptedRng([0.01]), RULES)).toEqual({ hit: false, reason: 'miss' });
    expect(rollHit({}, scriptedRng([0.06]), RULES)).toEqual({ hit: true, reason: null });
  });

  it('adds an independent 50% Blind check', () => {
    expect(rollHit({ blinded: true }, scriptedRng([0.5, 0.4]), RULES)).toEqual({
      hit: false,
      reason: 'blind',
    });
    expect(rollHit({ blinded: true }, scriptedRng([0.5, 0.6]), RULES)).toEqual({
      hit: true,
      reason: null,
    });
    expect(missChance({ blinded: true }, RULES)).toBeCloseTo(0.525);
    expect(missChance({}, RULES)).toBeCloseTo(0.05);
  });
});

describe('resources', () => {
  it('caps damage, healing and mana', () => {
    const target = { hp: 10, maxHp: 175 };
    expect(applyDamage(target, 25)).toBe(10);
    expect(target.hp).toBe(0);

    const hurt = { hp: 174, maxHp: 175 };
    expect(applyHeal(hurt, 25)).toBe(1);
    expect(hurt.hp).toBe(175);

    const wizard = { mp: 90, maxMp: 100 };
    expect(restoreMana(wizard, 35)).toBe(10);
    expect(wizard.mp).toBe(100);
  });
});
