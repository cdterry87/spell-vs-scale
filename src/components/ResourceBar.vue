<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  max: { type: Number, required: true },
  tone: { type: String, default: 'hp' }, // hp | mp
  showLabel: { type: Boolean, default: true },
});

const percent = computed(() =>
  props.max ? Math.max(0, Math.min(100, (props.value / props.max) * 100)) : 0,
);
</script>

<template>
  <div
    class="bar"
    :class="`bar--${tone}`"
    role="meter"
    :aria-label="label"
    :aria-valuenow="value"
    aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuetext="`${value} of ${max}`"
  >
    <span v-if="showLabel" class="bar__label" aria-hidden="true">{{ label }}</span>
    <div class="bar__track">
      <div class="bar__lag" :style="{ width: `${percent}%` }" />
      <div class="bar__fill" :style="{ width: `${percent}%` }" />
      <span class="bar__value" aria-hidden="true">{{ value }} / {{ max }}</span>
    </div>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 0.5em;
  min-width: 0;
}

.bar__label {
  flex: 0 0 auto;
  width: 2.1em;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9em;
  color: var(--c-ink);
  text-shadow: var(--shadow-text);
}

.bar__track {
  position: relative;
  flex: 1;
  height: var(--bar-height, 1.25em);
  border-radius: 999px;
  border: 1px solid rgba(232, 182, 76, 0.75);
  background: rgba(0, 0, 0, 0.7);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}

.bar__fill,
.bar__lag {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
}

.bar__lag {
  background: rgba(255, 240, 200, 0.55);
  transition: width 900ms ease 250ms;
}

.bar__fill {
  transition: width 280ms ease;
}

.bar--hp .bar__fill {
  background: linear-gradient(180deg, #ff6b5e 0%, var(--c-hp) 45%, var(--c-hp-deep) 100%);
}

.bar--mp .bar__fill {
  background: linear-gradient(180deg, #7fb7ff 0%, var(--c-mp) 45%, var(--c-mp-deep) 100%);
}

.bar__value {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.82em;
  letter-spacing: 0.03em;
  color: #fff;
  text-shadow:
    0 1px 2px #000,
    0 0 4px #000;
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .bar__fill,
  .bar__lag {
    transition: none;
  }
}
</style>
