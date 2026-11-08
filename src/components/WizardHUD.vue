<script setup>
import { computed } from 'vue';
import ResourceBar from './ResourceBar.vue';
import StatusEffects from './StatusEffects.vue';

/** Wizard HP/MP and statuses. The portrait is part of the HUD frame artwork. */
const props = defineProps({
  wizard: { type: Object, required: true },
  crystallized: { type: Boolean, default: false },
});

const buffs = computed(() =>
  props.crystallized
    ? [
        {
          id: 'crystal',
          name: 'Crystallized',
          symbol: '💎',
          tone: 'crystal',
          detail: "Halves damage and new status chances during the dragon's next turn.",
        },
      ]
    : [],
);
</script>

<template>
  <section class="wizard-hud" aria-label="Wizard">
    <ResourceBar label="HP" :value="wizard.hp" :max="wizard.maxHp" tone="hp" />
    <ResourceBar label="MP" :value="wizard.mp" :max="wizard.maxMp" tone="mp" />
    <StatusEffects
      class="wizard-hud__statuses"
      :effects="wizard.statuses"
      :immunities="wizard.immunities"
      :buffs="buffs"
      compact
    />
  </section>
</template>

<style scoped>
.wizard-hud {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.35em;
  height: 100%;
  --bar-height: 1.35em;
}

.wizard-hud__statuses {
  min-height: 1.5em;
}
</style>
