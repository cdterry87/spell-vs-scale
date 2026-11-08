<script setup>
import { computed } from 'vue';
import ResourceBar from './ResourceBar.vue';
import StatusEffects from './StatusEffects.vue';

const props = defineProps({
  name: { type: String, required: true },
  dragon: { type: Object, required: true },
  enraged: { type: Boolean, default: false },
  charging: { type: Boolean, default: false },
});

const buffs = computed(() => {
  const list = [];
  if (props.charging)
    list.push({
      id: 'firestorm',
      name: 'Fire Storm charging',
      symbol: '☄',
      tone: 'fire',
      detail: 'Fire Storm will be unleashed next turn unless the dragon is Frozen.',
    });
  if (props.enraged)
    list.push({
      id: 'enrage',
      name: 'Enraged',
      symbol: '💢',
      tone: 'rage',
      count: props.dragon.enrageAttacksRemaining,
      detail: `+50% damage on the next ${props.dragon.enrageAttacksRemaining} normal attacks; resists new statuses.`,
    });
  return list;
});
</script>

<template>
  <header class="dragon-hud" :class="{ 'dragon-hud--enraged': enraged }">
    <div class="dragon-hud__plate">
      <h2 class="dragon-hud__name">{{ name }}</h2>
    </div>
    <div class="dragon-hud__frame">
      <ResourceBar
        :label="`${name} health`"
        :value="dragon.hp"
        :max="dragon.maxHp"
        tone="hp"
        :show-label="false"
      />
    </div>
    <StatusEffects
      class="dragon-hud__statuses"
      :effects="dragon.statuses"
      :immunities="dragon.immunities"
      :buffs="buffs"
    />
  </header>
</template>

<style scoped>
.dragon-hud {
  position: absolute;
  top: max(1cqh, 6px);
  left: 50%;
  transform: translateX(-50%);
  width: min(74cqw, 1200px);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.dragon-hud__plate {
  position: relative;
  z-index: 1;
  margin-bottom: -0.55em;
  padding: 0.12em 2.4em 0.2em;
  border: 2px solid var(--c-border);
  border-radius: 6px;
  background: linear-gradient(180deg, #3a1d10, #160905);
  box-shadow:
    inset 0 0 0 1px rgba(255, 215, 122, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.6);
  clip-path: polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%);
}

.dragon-hud__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1rem, 3.4cqh, 2rem);
  font-weight: 700;
  color: var(--c-gold-bright);
  letter-spacing: 0.06em;
  text-shadow: var(--shadow-text);
}

.dragon-hud__frame {
  width: 100%;
  padding: 0.7em 0.9em 0.45em;
  border: 2px solid var(--c-border);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(40, 20, 10, 0.92), rgba(14, 7, 4, 0.92));
  box-shadow:
    inset 0 0 0 1px rgba(255, 215, 122, 0.25),
    0 6px 20px rgba(0, 0, 0, 0.6);
  font-size: clamp(0.8rem, 2.2cqh, 1.15rem);
  --bar-height: clamp(14px, 2.8cqh, 26px);
}

.dragon-hud--enraged .dragon-hud__frame {
  border-color: var(--c-enrage);
  box-shadow:
    inset 0 0 0 1px rgba(255, 80, 60, 0.4),
    0 0 18px rgba(255, 50, 30, 0.55);
}

.dragon-hud__statuses {
  margin-top: 6px;
  justify-content: center;
  font-size: clamp(0.8rem, 2cqh, 1rem);
}
</style>
