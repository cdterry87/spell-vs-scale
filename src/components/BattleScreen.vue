<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useGameStore } from '../stores/game.js';
import { GAME_CONFIG } from '../game/config.js';
import { hasStatus } from '../game/statusEffects.js';
import { useBattlePresentation } from '../composables/useBattlePresentation.js';
import { useReducedMotion } from '../composables/useSceneAtmosphere.js';
import SceneBackground from './SceneBackground.vue';
import CharacterSprite from './CharacterSprite.vue';
import FloatingCombatText from './FloatingCombatText.vue';
import BattleWarning from './BattleWarning.vue';
import DragonHealthBar from './DragonHealthBar.vue';
import WizardHUD from './WizardHUD.vue';
import ActionBar from './ActionBar.vue';
import BattleLog from './BattleLog.vue';
import GameMenu from './GameMenu.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import gameBackground from '../../images/game_background.webp';
import wizardIdle from '../../images/wizard_idle.webp';
import wizardAttack from '../../images/wizard_attack.webp';
import dragonImage from '../../images/dragon.webp';
import hudFrame from '../../images/hud.webp';

const game = useGameStore();
const battle = computed(() => game.battle);
/*
 * Freeze visually lingers until the dragon's next turn begins: the status itself expires at the
 * end of the skipped turn (granting immunity on that same dragon turn), so the ice stays on
 * through the following player turn and melts when the next dragon turn starts.
 */
const dragonFrozen = computed(() => {
  const { dragon, actorTurns } = game.battle;
  return (
    hasStatus(dragon, 'freeze') ||
    dragon.immunities.some(
      (i) => i.statusId === 'freeze' && i.grantedAtActorTurn === actorTurns.dragon,
    )
  );
});
const dragonBurning = computed(() => hasStatus(game.battle.dragon, 'burn'));
const wizardBurning = computed(() => hasStatus(game.battle.wizard, 'burn'));
const dragonBlind = computed(() => hasStatus(game.battle.dragon, 'blind'));
const reducedMotion = useReducedMotion();

const { floats, poses, auras, hits, shakeKey, warning, announcement } = useBattlePresentation(
  () => game.battle.log,
);

const wizardFloats = computed(() => floats.value.filter((f) => f.target === 'wizard'));
const dragonFloats = computed(() => floats.value.filter((f) => f.target === 'dragon'));

const wizardImages = { idle: wizardIdle, attack: wizardAttack };
const dragonImages = { idle: dragonImage };

/* Arena shake for heavy hits (suppressed with reduced motion). */
const shaking = ref(false);
let shakeTimer = null;
watch(shakeKey, () => {
  if (reducedMotion.value) return;
  shaking.value = false;
  clearTimeout(shakeTimer);
  requestAnimationFrame(() => {
    shaking.value = true;
    shakeTimer = setTimeout(() => (shaking.value = false), 420);
  });
});

/* Log, menu and confirmation */
const logExpanded = ref(false);
const confirmKind = ref(null); // null | 'restart' | 'main-menu'

const confirmCopy = computed(() =>
  confirmKind.value === 'restart'
    ? {
        title: 'Restart battle?',
        description: 'The current battle and its statistics will be lost.',
        confirmLabel: 'Restart',
      }
    : {
        title: 'Return to main menu?',
        description: 'The current battle will be abandoned.',
        confirmLabel: 'Leave battle',
      },
);

function request(kind) {
  if (!game.battleInProgress) return perform(kind);
  confirmKind.value = kind;
}

function perform(kind) {
  confirmKind.value = null;
  if (kind === 'restart') game.restartBattle();
  else game.returnToTitle();
}

function selectAction(id) {
  if (confirmKind.value) return;
  game.playAction(id);
}

function onKeydown(event) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (confirmKind.value) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (game.menuOpen) game.closeMenu();
    else game.openMenu();
    return;
  }
  if (game.menuOpen) return;
  if (/^[1-9]$/.test(event.key)) {
    const action = game.actions[Number(event.key) - 1];
    if (action?.available) {
      event.preventDefault();
      game.playAction(action.id);
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  clearTimeout(shakeTimer);
});
</script>

<template>
  <main
    class="scene battle"
    :class="{ 'battle--player-turn': game.isPlayerTurn, 'battle--locked': !game.inputEnabled }"
  >
    <h1 class="visually-hidden">Spell vs Scale — battle against {{ GAME_CONFIG.dragon.name }}</h1>

    <div class="battle__world" :class="{ 'battle__world--shake': shaking }">
      <SceneBackground :src="gameBackground" :focus-x="50" :focus-y="62" />

      <div class="arena">
        <CharacterSprite
          character="dragon"
          side="right"
          :label="dragonFrozen ? `${GAME_CONFIG.dragon.name} (frozen)` : GAME_CONFIG.dragon.name"
          :pose="poses.dragon"
          :images="dragonImages"
          :hit-count="hits.dragon"
          :frozen="dragonFrozen"
          :burning="dragonBurning"
          :class="{
            'sprite--enraged': game.dragonEnraged,
            'sprite--charging': game.fireStormCharging,
          }"
        >
          <FloatingCombatText class="floats--dragon" :items="dragonFloats" />
        </CharacterSprite>

        <CharacterSprite
          character="wizard"
          side="left"
          label="Wizard"
          :pose="poses.wizard"
          :images="wizardImages"
          :hit-count="hits.wizard"
          :burning="wizardBurning"
          :obscured="dragonBlind"
          :aura="auras.wizard"
          :class="{ 'sprite--crystal': battle.crystallizeActiveForNextDragonTurn }"
        >
          <FloatingCombatText class="floats--wizard" :items="wizardFloats" />
        </CharacterSprite>
      </div>
    </div>

    <DragonHealthBar
      :name="GAME_CONFIG.dragon.name"
      :dragon="battle.dragon"
      :enraged="game.dragonEnraged"
      :charging="game.fireStormCharging"
    />

    <BattleWarning :warning="warning" />

    <p
      class="turn-indicator"
      :class="game.isPlayerTurn ? 'turn-indicator--player' : 'turn-indicator--dragon'"
      aria-live="polite"
    >
      {{ game.turnLabel }}
    </p>

    <BattleLog
      class="battle__log"
      :entries="battle.log"
      :expanded="logExpanded"
      @toggle="logExpanded = !logExpanded"
    />

    <div class="hud" :style="{ '--hud-art': `url(${hudFrame})` }">
      <div class="hud__wizard">
        <WizardHUD
          :wizard="battle.wizard"
          :crystallized="battle.crystallizeActiveForNextDragonTurn"
        />
      </div>
      <div class="hud__actions">
        <ActionBar
          :actions="game.actions"
          :input-enabled="game.inputEnabled"
          @select-action="selectAction"
          @open-menu="game.openMenu()"
        />
      </div>
    </div>

    <p class="visually-hidden" aria-live="assertive">{{ announcement }}</p>

    <GameMenu
      v-if="game.menuOpen && !confirmKind"
      @resume="game.closeMenu()"
      @request-restart="request('restart')"
      @request-main-menu="request('main-menu')"
    />
    <ConfirmDialog
      v-if="confirmKind"
      v-bind="confirmCopy"
      @confirm="perform(confirmKind)"
      @cancel="confirmKind = null"
    />
  </main>
</template>

<style scoped>
.battle {
  /* HUD frame art is 2172×275; keep its proportions on roomy screens. */
  --hud-w: min(100cqw, 210cqh);
  --hud-h: calc(var(--hud-w) * 275 / 2172);
  --wiz-h: min(60cqh, 34cqw);
  --drg-h: min(66cqh, 41cqw);
  background: #1a0b06;
}

.battle__world {
  position: absolute;
  inset: 0;
}

.battle__world--shake {
  animation: shake 400ms ease-in-out;
}

.arena {
  position: absolute;
  inset: 0;
  z-index: 1;
}

/* ---------- combatants ---------- */
.arena :deep(.sprite--wizard) {
  left: max(6cqw, var(--safe-left));
  bottom: calc(var(--hud-h) - 4cqh);
  width: calc(var(--wiz-h) * 0.62);
  height: var(--wiz-h);
  z-index: 3;
}

.arena :deep(.sprite__img--idle) {
  height: 100%;
  left: -6%;
}

/* Attack art is drawn at a different scale; match the figure size and torso position. */
.arena :deep(.sprite--wizard .sprite__img--attack) {
  height: 78%;
  left: -12%;
}

.arena :deep(.sprite--dragon) {
  right: max(1cqw, var(--safe-right));
  bottom: calc(var(--hud-h) + 4cqh);
  width: calc(var(--drg-h) * 1.5);
  height: var(--drg-h);
  z-index: 2;
}

.arena :deep(.sprite--dragon .sprite__img--idle) {
  left: 0;
}

.arena :deep(.sprite--charging)::after {
  content: '';
  position: absolute;
  left: 4%;
  top: 30%;
  width: 22%;
  height: 22%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 230, 140, 0.95),
    rgba(255, 120, 20, 0.5) 45%,
    transparent 70%
  );
  animation: pulse-glow 0.8s ease-in-out infinite;
  mix-blend-mode: screen;
}

.arena :deep(.floats--wizard) {
  inset: 0 0 auto 0;
  height: 40%;
}

.arena :deep(.floats--dragon) {
  inset: 10% 45% auto 5%;
  height: 40%;
}

/* ---------- turn + log ---------- */
.turn-indicator {
  position: absolute;
  z-index: 15;
  right: max(2cqw, var(--safe-right));
  bottom: calc(var(--hud-h) + 1.2cqh);
  margin: 0;
  padding: 0.25em 1em;
  border: 2px solid var(--c-border);
  border-radius: 999px;
  background: rgba(16, 8, 5, 0.88);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(0.85rem, 2.4cqh, 1.25rem);
  letter-spacing: 0.04em;
  text-shadow: var(--shadow-text);
  transition:
    color 200ms ease,
    border-color 200ms ease;
}

.turn-indicator--player {
  color: var(--c-gold-bright);
  box-shadow: 0 0 14px rgba(255, 200, 90, 0.45);
}

.turn-indicator--dragon {
  color: #ff9a80;
  border-color: #8a2a1a;
}

.battle__log {
  position: absolute;
  z-index: 15;
  left: max(30cqw, var(--safe-left));
  bottom: calc(var(--hud-h) + 1.2cqh);
}

/* ---------- bottom HUD ---------- */
.hud {
  position: absolute;
  z-index: 20;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: var(--hud-w);
  height: var(--hud-h);
  background: var(--hud-art) center / 100% 100% no-repeat;
  padding-bottom: var(--safe-bottom);
}

.hud::before {
  /* Fill side gaps when the viewport is wider than the HUD art. */
  content: '';
  position: absolute;
  inset: 12% -100vw 0;
  z-index: -1;
  background: linear-gradient(180deg, rgba(20, 10, 6, 0), rgba(10, 5, 3, 0.85) 40%);
}

.hud__wizard {
  position: absolute;
  left: 13.6%;
  width: 22.6%;
  top: 15%;
  height: 70%;
  font-size: max(11px, calc(var(--hud-w) * 0.0105));
}

.hud__actions {
  position: absolute;
  left: 38.8%;
  width: 56.8%;
  top: 11%;
  height: 78%;
  font-size: max(10px, calc(var(--hud-w) * 0.0092));
  --slot-icon: calc(var(--hud-w) * 0.047);
}

.battle--locked .hud__actions :deep(.slot__icon-wrap) {
  opacity: 0.88;
}

/* ---------- shared compact HUD (phones, either orientation) ---------- */
@container (max-height: 560px) or (max-width: 780px) or (orientation: portrait) {
  .hud {
    display: grid;
    align-content: start;
    gap: 6px;
    padding: 6px max(10px, var(--safe-right)) max(6px, var(--safe-bottom))
      max(10px, var(--safe-left));
    background: linear-gradient(180deg, #2a160c, #120804);
    border-top: 2px solid var(--c-border);
    box-shadow: inset 0 1px 0 rgba(255, 215, 122, 0.3);
  }

  .hud::before {
    display: none;
  }

  .hud__wizard,
  .hud__actions {
    position: static;
    width: auto;
    height: auto;
    min-width: 0;
  }

  .hud__wizard {
    font-size: 12px;
  }

  .hud__wizard :deep(.wizard-hud) {
    --bar-height: 16px;
    gap: 4px;
  }

  .hud__actions {
    font-size: 9px;
  }

  .hud__actions :deep(.slot__cost) {
    display: none;
  }

  .hud__actions :deep(.slot__key) {
    font-size: 0.85em;
  }

  /* Smaller dragon nameplate and health bar. */
  :deep(.dragon-hud__plate) {
    padding: 0 1.6em 0.1em;
  }

  :deep(.dragon-hud__name) {
    font-size: 0.85rem;
  }

  :deep(.dragon-hud__frame) {
    padding: 0.55em 0.6em 0.3em;
    font-size: 0.7rem;
    --bar-height: 11px;
    border-radius: 7px;
  }

  :deep(.dragon-hud__statuses) {
    margin-top: 3px;
    font-size: 0.68rem;
  }

  .battle__log {
    font-size: 0.72rem;
  }

  .turn-indicator {
    font-size: 0.8rem;
  }
}

/* ---------- phone landscape ---------- */
@container (orientation: landscape) and ((max-height: 560px) or (max-width: 780px)) {
  /* A container query can't restyle the container itself, so set the vars on its children. */
  .battle__world,
  .hud,
  .hud__actions,
  .turn-indicator,
  .battle__log {
    --hud-w: 100cqw;
    --slot-icon: min(11.5cqh, 6.4cqw);
    /* 6px pad + 16px bars + 6px gap + icon + ~13px label + 6px pad */
    --hud-h: calc(var(--slot-icon) + 50px + var(--safe-bottom));
    --wiz-h: min(60cqh, 30cqw);
    --drg-h: min(56cqh, 40cqw);
  }

  /* HP and MP side by side, statuses after them. */
  .hud__wizard :deep(.wizard-hud) {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .hud__wizard :deep(.wizard-hud > .bar) {
    flex: 1 1 0;
  }

  .hud__wizard :deep(.wizard-hud__statuses) {
    flex: 0 1 auto;
    min-height: 0;
  }

  /* All ten slots on one row. */
  .hud__actions :deep(.action-bar__slots) {
    grid-template-columns: repeat(10, minmax(0, 1fr));
    gap: 2px;
  }

  :deep(.dragon-hud) {
    width: 46cqw;
    top: 4px;
  }

  /* In the open ground between the wizard and the dragon. */
  .battle__log {
    left: 31cqw;
    right: auto;
    bottom: calc(var(--hud-h) + 2cqh);
    max-width: 28cqw;
  }
}

/* ---------- phone / tablet portrait ---------- */
@container (orientation: portrait) {
  .battle__world,
  .hud,
  .hud__actions,
  .turn-indicator,
  .battle__log {
    --hud-w: 100cqw;
    --slot-icon: min(12.5cqw, 6.5cqh);
    /* two bars + statuses + two rows of slots + padding */
    --hud-h: calc(2 * var(--slot-icon) + 112px + var(--safe-bottom));
    --wiz-h: min(32cqh, 62cqw);
    --drg-h: min(30cqh, 64cqw);
  }

  /* HP and MP full width, actions in two rows of five below. */
  .hud__actions :deep(.action-bar__slots) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    row-gap: 4px;
  }

  :deep(.dragon-hud) {
    width: calc(100cqw - 24px);
    top: max(6px, env(safe-area-inset-top, 0px));
  }

  /* Dragon sits high, just under its health bar. */
  .arena :deep(.sprite--dragon) {
    top: 9cqh;
    bottom: auto;
    right: 0;
    /* Tilt the head down toward the wizard below. `rotate` composes with the
       transform-based attack/hit nudges instead of replacing them. */
    rotate: -12deg;
    transform-origin: 50% 50%;
  }

  .arena :deep(.sprite--wizard) {
    left: 2cqw;
  }

  /* Right side, stacked just above the "Your turn" label. */
  .battle__log.battle__log {
    left: auto;
    right: max(10px, var(--safe-right));
    bottom: calc(var(--hud-h) + 1.2cqh + 2.6em);
    max-width: 60cqw;
    align-items: flex-end;
  }

  .battle__log :deep(.log__feed) {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .battle__log :deep(.log__list) {
    width: min(36em, 88cqw);
    max-height: 30cqh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .battle__world--shake {
    animation: none;
  }
  .arena :deep(.sprite--charging)::after {
    animation: none;
  }
}
</style>
