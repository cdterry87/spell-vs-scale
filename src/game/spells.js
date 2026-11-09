import { GAME_CONFIG } from './config.js';

import bashIcon from '../assets/icons/bash.webp';
import immolateIcon from '../assets/icons/immolate.webp';
import thunderIcon from '../assets/icons/thunder.webp';
import blizzardIcon from '../assets/icons/blizzard.webp';
import arcanumIcon from '../assets/icons/arcanum.webp';
import crystallizeIcon from '../assets/icons/crystallize.webp';
import healIcon from '../assets/icons/heal.webp';
import cureIcon from '../assets/icons/cure.webp';
import potionIcon from '../assets/icons/mana-potion.webp';

/**
 * Wizard actions, in hotbar order (slot 1–9).
 * kind: 'attack' deals direct damage, 'support' targets the wizard, 'item' uses a potion.
 * countsAsSpell: included in the spellsCast statistic (Bash and potions are tracked separately).
 */
export const SPELLS = Object.freeze([
  {
    id: 'bash',
    name: 'Bash',
    icon: bashIcon,
    kind: 'attack',
    damageType: 'physical',
    mpCost: 0,
    damage: [3, 6],
    countsAsSpell: false,
    description: 'A weak staff strike. Always available and costs no mana.',
  },
  {
    id: 'immolate',
    name: 'Immolate',
    icon: immolateIcon,
    kind: 'attack',
    damageType: 'magic',
    mpCost: 12,
    damage: [12, 18],
    status: { id: 'burn', chance: 0.35 },
    countsAsSpell: true,
    description: 'Engulf the dragon in flame. 35% chance to Burn for 3 turns.',
  },
  {
    id: 'thunder',
    name: 'Thunder',
    icon: thunderIcon,
    kind: 'attack',
    damageType: 'magic',
    mpCost: 15,
    damage: [10, 16],
    status: { id: 'blind', chance: 0.35 },
    countsAsSpell: true,
    description: 'A blinding lightning bolt. 35% chance to Blind for 3 turns.',
  },
  {
    id: 'blizzard',
    name: 'Blizzard',
    icon: blizzardIcon,
    kind: 'attack',
    damageType: 'magic',
    mpCost: 20,
    damage: [8, 14],
    status: { id: 'freeze', chance: 0.25 },
    countsAsSpell: true,
    description: 'A freezing gale. 25% chance to Freeze for 1 turn, which interrupts Fire Storm.',
  },
  {
    id: 'arcanum',
    name: 'Arcanum',
    icon: arcanumIcon,
    kind: 'attack',
    damageType: 'magic',
    mpCost: 30,
    damage: [40, 50],
    cooldown: GAME_CONFIG.arcanumCooldown,
    countsAsSpell: true,
    description: `Raw arcane power for heavy damage. ${GAME_CONFIG.arcanumCooldown}-turn cooldown.`,
  },
  {
    id: 'crystallize',
    name: 'Crystallize',
    icon: crystallizeIcon,
    kind: 'support',
    mpCost: 10,
    countsAsSpell: true,
    description:
      "Halves incoming damage and the chance of new negative statuses during the dragon's next turn.",
  },
  {
    id: 'heal',
    name: 'Heal',
    icon: healIcon,
    kind: 'support',
    mpCost: 20,
    heal: [40, 50],
    countsAsSpell: true,
    description: 'Restore 40–50 HP.',
  },
  {
    id: 'cure',
    name: 'Cure',
    icon: cureIcon,
    kind: 'support',
    mpCost: 10,
    heal: [12, 15],
    countsAsSpell: true,
    description: 'Remove all negative statuses (immune to them for one turn) and restore 12–15 HP.',
  },
  {
    id: 'mana-potion',
    name: 'Mana Potion',
    shortName: 'Potion',
    icon: potionIcon,
    kind: 'item',
    mpCost: 0,
    restoreMp: GAME_CONFIG.wizard.potionRestore,
    countsAsSpell: false,
    description: `Restore ${GAME_CONFIG.wizard.potionRestore} MP. Uses your turn.`,
  },
]);

export const SPELLS_BY_ID = Object.freeze(Object.fromEntries(SPELLS.map((s) => [s.id, s])));
