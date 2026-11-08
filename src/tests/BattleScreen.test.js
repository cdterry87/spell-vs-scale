import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SpellButton from '../components/SpellButton.vue';
import ActionBar from '../components/ActionBar.vue';
import BattleScreen from '../components/BattleScreen.vue';
import SceneTitleImage from '../components/SceneTitleImage.vue';
import BattleResults from '../components/BattleResults.vue';
import { useGameStore } from '../stores/game.js';
import { TIMING } from '../game/config.js';
import { constantRng } from './helpers.js';

const action = (overrides = {}) => ({
  id: 'immolate',
  name: 'Immolate',
  slot: 2,
  kind: 'attack',
  mpCost: 12,
  damage: [12, 18],
  description: 'Burn it.',
  icon: '',
  available: true,
  disabledReason: null,
  cooldownRemaining: 0,
  charges: null,
  ...overrides,
});

beforeEach(() => {
  setActivePinia(createPinia());
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
});

afterEach(() => vi.useRealTimers());

describe('SpellButton', () => {
  it('emits select with its id when available', async () => {
    const wrapper = mount(SpellButton, { props: { action: action() } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('select')).toEqual([['immolate']]);
  });

  it('does not emit when unavailable and exposes the reason', async () => {
    const wrapper = mount(SpellButton, {
      props: {
        action: action({ available: false, disabledReason: 'Not enough mana (needs 12 MP).' }),
      },
    });
    await wrapper.trigger('click');
    expect(wrapper.emitted('select')).toBeUndefined();
    expect(wrapper.attributes('aria-label')).toContain('Not enough mana');
    expect(wrapper.attributes('aria-disabled')).toBe('true');
  });
});

describe('ActionBar', () => {
  it('forwards the selected action id and opens the menu', async () => {
    const wrapper = mount(ActionBar, { props: { actions: [action()], inputEnabled: true } });
    await wrapper.findComponent(SpellButton).trigger('click');
    expect(wrapper.emitted('select-action')).toEqual([['immolate']]);
    await wrapper.find('[aria-label="Open menu"]').trigger('click');
    expect(wrapper.emitted('open-menu')).toHaveLength(1);
  });
});

describe('BattleScreen', () => {
  it('invokes the store once per click and blocks repeat clicks during resolution', async () => {
    vi.useFakeTimers();
    const game = useGameStore();
    game.setRng(constantRng(0.5));
    game.startGame();
    const spy = vi.spyOn(game, 'playAction');
    const wrapper = mount(BattleScreen);

    const bash = wrapper.findAllComponents(SpellButton)[0];
    await bash.trigger('click');
    await bash.trigger('click');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(game.battle.statistics.playerTurnsTaken).toBe(1);

    // Store re-validates even if called directly while it is not the player's turn.
    expect(game.playAction('bash').ok).toBe(false);

    vi.advanceTimersByTime(TIMING.afterPlayerAction + TIMING.afterDragonAction + 50);
    expect(game.battle.phase).toBe('playerTurn');
    wrapper.unmount();
  });

  it('supports number-key shortcuts and ignores them while the menu is open', async () => {
    const game = useGameStore();
    game.setRng(constantRng(0.5));
    game.startGame();
    const wrapper = mount(BattleScreen, { attachTo: document.body });

    game.openMenu();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(game.battle.statistics.playerTurnsTaken).toBe(0);

    game.closeMenu();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(game.battle.statistics.bashesUsed).toBe(1);
    wrapper.unmount();
  });

  it('restart invalidates scheduled dragon turns from the previous battle', () => {
    vi.useFakeTimers();
    const game = useGameStore();
    game.setRng(constantRng(0.5));
    game.startGame();
    game.playAction('bash');
    game.restartBattle();
    vi.advanceTimersByTime(5000);
    expect(game.battle.actorTurns.dragon).toBe(0);
    expect(game.battle.phase).toBe('playerTurn');
    expect(game.battle.statistics.playerTurnsTaken).toBe(0);
  });
});

describe('scenes', () => {
  it('title art carries accessible heading text', () => {
    const wrapper = mount(SceneTitleImage, { props: { src: 'x.webp', text: 'Spell vs Scale' } });
    expect(wrapper.find('h1').text()).toBe('Spell vs Scale');
    expect(wrapper.find('img').attributes('alt')).toBe('');
  });

  it('results use distinct art per variant and emit navigation', async () => {
    const statistics = {
      playerTurnsTaken: 4,
      damageDealt: 60,
      damageReceived: 20,
      healingDone: 5,
      spellsCast: { immolate: 2 },
      bashesUsed: 1,
      potionsUsed: 0,
    };
    const victory = mount(BattleResults, { props: { variant: 'victory', statistics } });
    const defeat = mount(BattleResults, { props: { variant: 'defeat', statistics } });
    expect(victory.find('h1').text()).toBe('Victory!');
    expect(defeat.find('h1').text()).toBe('Defeat!');
    expect(victory.find('.scene-bg__img').attributes('src')).not.toBe(
      defeat.find('.scene-bg__img').attributes('src'),
    );
    expect(victory.findAll('.glint').length).toBeGreaterThan(0);
    expect(defeat.findAll('.beam').length).toBeGreaterThan(0);

    await victory.findAll('button')[0].trigger('click');
    await victory.findAll('button')[1].trigger('click');
    expect(victory.emitted('rematch')).toHaveLength(1);
    expect(victory.emitted('main-menu')).toHaveLength(1);
  });
});
