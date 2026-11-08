import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { TIMING } from '../game/config.js';
import { SPELLS } from '../game/spells.js';
import {
  createBattleState,
  getActionAvailability,
  performPlayerAction,
  runDragonTurn,
  startPlayerTurn,
  wizardCooldownRemaining,
} from '../game/turnEngine.js';
import { isEnraged } from '../game/dragonAI.js';

/**
 * Orchestrates screens, phases and pacing. Combat rules live in src/game.
 * Turn steps are paced with timers purely for readability; each step is guarded by a
 * battle generation id so a restart invalidates anything still scheduled.
 */
export const useGameStore = defineStore('game', () => {
  const screen = ref('title'); // title | battle | results
  const battle = ref(createBattleState());
  const battleId = ref(0);
  const menuOpen = ref(false);

  let rng = Math.random;
  let timer = null;
  let pausedStep = null;

  /* ---------------------------------------------------------------- pacing */

  function cancelScheduled() {
    clearTimeout(timer);
    timer = null;
    pausedStep = null;
  }

  function schedule(step, delay) {
    const generation = battleId.value;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (generation !== battleId.value) return;
      if (menuOpen.value) pausedStep = step;
      else step();
    }, delay);
  }

  function dragonStep() {
    const outcome = runDragonTurn(battle.value, rng);
    if (outcome === 'continue') schedule(playerStep, TIMING.afterDragonAction);
    else schedule(showResults, TIMING.beforeResults);
  }

  function playerStep() {
    const outcome = startPlayerTurn(battle.value, rng);
    if (outcome === 'defeat') schedule(showResults, TIMING.beforeResults);
    else if (outcome === 'skipped') schedule(dragonStep, TIMING.skippedTurn);
  }

  function showResults() {
    screen.value = 'results';
  }

  /* -------------------------------------------------------- public commands */

  function startGame() {
    cancelScheduled();
    battleId.value += 1;
    battle.value = createBattleState();
    menuOpen.value = false;
    screen.value = 'battle';
    startPlayerTurn(battle.value, rng);
  }

  function playAction(actionId) {
    if (screen.value !== 'battle' || menuOpen.value) return { ok: false, reason: 'Menu is open.' };
    const result = performPlayerAction(battle.value, actionId, rng);
    if (!result.ok) return result;
    if (result.outcome === 'victory') schedule(showResults, TIMING.beforeResults);
    else schedule(dragonStep, TIMING.afterPlayerAction);
    return result;
  }

  function openMenu() {
    if (screen.value === 'battle') menuOpen.value = true;
  }

  function closeMenu() {
    menuOpen.value = false;
    if (pausedStep) {
      const step = pausedStep;
      pausedStep = null;
      schedule(step, 300);
    }
  }

  const restartBattle = startGame;

  function returnToTitle() {
    cancelScheduled();
    battleId.value += 1;
    battle.value = createBattleState();
    menuOpen.value = false;
    screen.value = 'title';
  }

  /** Test hook: inject a deterministic RNG. */
  function setRng(fn) {
    rng = fn;
  }

  /* ------------------------------------------------------------ derived UI */

  const isPlayerTurn = computed(() => battle.value.phase === 'playerTurn');
  const inputEnabled = computed(
    () => screen.value === 'battle' && isPlayerTurn.value && !menuOpen.value,
  );
  const battleInProgress = computed(
    () => screen.value === 'battle' && battle.value.phase !== 'finished',
  );

  const actions = computed(() =>
    SPELLS.map((spell, index) => {
      const availability = getActionAvailability(battle.value, spell.id);
      return {
        ...spell,
        slot: index + 1,
        available: availability.available && !menuOpen.value,
        disabledReason: availability.reason,
        cooldownRemaining: wizardCooldownRemaining(battle.value, spell.id),
        charges: spell.kind === 'item' ? battle.value.wizard.potionCount : null,
      };
    }),
  );

  const dragonEnraged = computed(() => isEnraged(battle.value.dragon));
  const fireStormCharging = computed(() => battle.value.dragon.chargingFireStorm);

  const turnLabel = computed(() => {
    const phase = battle.value.phase;
    if (phase === 'finished') return battle.value.winner === 'wizard' ? 'Victory!' : 'Defeat';
    if (phase === 'playerTurn') return 'Your turn';
    return 'Solinvictus’s turn';
  });

  const winner = computed(() => battle.value.winner);

  return {
    screen,
    battle,
    battleId,
    menuOpen,
    startGame,
    playAction,
    openMenu,
    closeMenu,
    restartBattle,
    returnToTitle,
    setRng,
    isPlayerTurn,
    inputEnabled,
    battleInProgress,
    actions,
    dragonEnraged,
    fireStormCharging,
    turnLabel,
    winner,
  };
});
