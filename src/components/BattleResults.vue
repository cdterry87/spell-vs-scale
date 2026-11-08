<script setup>
import { computed, onMounted, useTemplateRef } from 'vue';
import SceneBackground from './SceneBackground.vue';
import SceneTitleImage from './SceneTitleImage.vue';
import ResultsAtmosphere from './ResultsAtmosphere.vue';
import { SPELLS_BY_ID } from '../game/spells.js';
import victoryBackground from '../../images/victory_background.webp';
import defeatBackground from '../../images/defeat_background.webp';
import victoryTitle from '../../images/victory_title.webp';
import defeatTitle from '../../images/defeat_title.webp';

const props = defineProps({
  variant: { type: String, required: true, validator: (v) => ['victory', 'defeat'].includes(v) },
  statistics: { type: Object, required: true },
});
const emit = defineEmits(['rematch', 'main-menu']);

const isVictory = computed(() => props.variant === 'victory');
const art = computed(() =>
  isVictory.value
    ? { bg: victoryBackground, title: victoryTitle, text: 'Victory!', fx: 50, fy: 55 }
    : { bg: defeatBackground, title: defeatTitle, text: 'Defeat!', fx: 55, fy: 55 },
);

const totalSpells = computed(() =>
  Object.values(props.statistics.spellsCast).reduce((sum, n) => sum + n, 0),
);
const spellBreakdown = computed(() =>
  Object.entries(props.statistics.spellsCast)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ id, name: SPELLS_BY_ID[id].name, count })),
);

const summary = computed(() =>
  isVictory.value
    ? 'Solinvictus has fallen. Its hoard is yours.'
    : 'The cavern claims another challenger.',
);

const rematchButton = useTemplateRef('rematch');
onMounted(() => rematchButton.value?.focus({ preventScroll: true }));
</script>

<template>
  <main class="scene results" :class="`results--${variant}`">
    <SceneBackground :src="art.bg" :focus-x="art.fx" :focus-y="art.fy">
      <ResultsAtmosphere :variant="variant" />
    </SceneBackground>
    <div class="results__shade" aria-hidden="true" />

    <div class="results__content">
      <SceneTitleImage class="results__title" :src="art.title" :text="art.text" />
      <section class="results__panel panel" aria-labelledby="results-summary">
        <p id="results-summary" class="results__summary">{{ summary }}</p>
        <dl class="stats">
          <div class="stat">
            <dt>Turns taken</dt>
            <dd>{{ statistics.playerTurnsTaken }}</dd>
          </div>
          <div class="stat">
            <dt>Damage dealt</dt>
            <dd>{{ statistics.damageDealt }}</dd>
          </div>
          <div class="stat">
            <dt>Damage received</dt>
            <dd>{{ statistics.damageReceived }}</dd>
          </div>
          <div class="stat">
            <dt>HP healed</dt>
            <dd>{{ statistics.healingDone }}</dd>
          </div>
          <div class="stat">
            <dt>Spells cast</dt>
            <dd>{{ totalSpells }}</dd>
          </div>
          <div class="stat">
            <dt>Bash / Potions</dt>
            <dd>{{ statistics.bashesUsed }} / {{ statistics.potionsUsed }}</dd>
          </div>
        </dl>
        <ul v-if="spellBreakdown.length" class="breakdown" aria-label="Spells cast by type">
          <li v-for="spell in spellBreakdown" :key="spell.id">
            {{ spell.name }} <strong>×{{ spell.count }}</strong>
          </li>
        </ul>
        <div class="results__actions">
          <button ref="rematch" type="button" class="btn btn--primary" @click="emit('rematch')">
            Rematch
          </button>
          <button type="button" class="btn btn--quiet" @click="emit('main-menu')">Main Menu</button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.results__shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(ellipse 45% 55% at 50% 58%, rgba(0, 0, 0, 0.45), transparent 75%);
}

.results__content {
  position: relative;
  z-index: 2;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: max(2cqh, 10px) 16px max(3cqh, 12px);
  gap: clamp(4px, 1.5cqh, 16px);
}

.results__title {
  width: min(56cqw, 70cqh, 760px);
  flex-shrink: 0;
}

.results__panel {
  width: min(560px, 100%);
  padding: clamp(12px, 2.6cqh, 24px) clamp(14px, 3cqw, 28px);
  background: rgba(16, 9, 6, 0.8);
  backdrop-filter: blur(3px);
}

.results__summary {
  margin: 0 0 12px;
  text-align: center;
  font-family: var(--font-display);
  font-size: clamp(0.95rem, 2.4cqh, 1.2rem);
  color: var(--c-gold-bright);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
}

.stat {
  padding: 8px 6px;
  border: 1px solid rgba(232, 182, 76, 0.35);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  text-align: center;
}

.stat dt {
  font-size: 0.78rem;
  color: var(--c-ink-dim);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.stat dd {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 3.2cqh, 1.6rem);
  font-weight: 700;
  color: var(--c-ink);
}

.breakdown {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 14px;
  margin: 12px 0 0;
  padding: 0;
  font-size: 0.9rem;
  color: var(--c-ink-dim);
}

.breakdown strong {
  color: var(--c-gold-bright);
}

.results__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: clamp(12px, 2.6cqh, 22px);
}

/* Keep the grave (center of the defeat art) visible: dock the panel to the left. */
@container (min-width: 900px) {
  .results--defeat .results__panel {
    align-self: flex-start;
    width: min(440px, 32cqw);
    margin-left: max(3cqw, var(--safe-left));
  }
  .results--defeat .stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-height: 520px) {
  .stats {
    grid-template-columns: repeat(6, 1fr);
  }
  .stat dt {
    font-size: 0.64rem;
  }
}
</style>
