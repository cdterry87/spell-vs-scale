<script setup>
import { computed } from 'vue';

const props = defineProps({
  action: { type: Object, required: true },
  pending: { type: Boolean, default: false },
});
const emit = defineEmits(['select', 'touch-preview', 'preview']);

const costLabel = computed(() => {
  const a = props.action;
  if (a.kind === 'item') return `×${a.charges}`;
  return a.mpCost ? `${a.mpCost} MP` : 'Free';
});

const label = computed(() => {
  const a = props.action;
  const parts = [`${a.slot}. ${a.name}`, costLabel.value.replace('×', 'charges: '), a.description];
  if (!a.available && a.disabledReason) parts.push(`Unavailable: ${a.disabledReason}`);
  return parts.join('. ');
});

function onClick(event) {
  // Touch: first tap shows details, second tap on the same slot confirms.
  if (event.pointerType === 'touch' && !props.pending) {
    emit('touch-preview', props.action.id);
    return;
  }
  if (props.action.available) emit('select', props.action.id);
}
</script>

<template>
  <button
    type="button"
    class="slot"
    :class="{
      'slot--disabled': !action.available,
      'slot--cooldown': action.cooldownRemaining > 0,
      'slot--pending': pending,
    }"
    :aria-disabled="!action.available"
    :aria-label="label"
    :aria-keyshortcuts="String(action.slot)"
    @click="onClick"
    @mouseenter="emit('preview', action.id)"
    @focus="emit('preview', action.id)"
  >
    <span class="slot__icon-wrap">
      <img class="slot__icon" :src="action.icon" alt="" draggable="false" />
      <span class="slot__key" aria-hidden="true">{{ action.slot }}</span>
      <span v-if="action.cooldownRemaining > 0" class="slot__cooldown" aria-hidden="true">
        {{ action.cooldownRemaining }}
      </span>
    </span>
    <span class="slot__name" aria-hidden="true">{{ action.shortName ?? action.name }}</span>
    <span class="slot__cost" :class="`slot__cost--${action.kind}`" aria-hidden="true">{{
      costLabel
    }}</span>
  </button>
</template>

<style scoped>
.slot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.15em;
  min-width: 0;
  padding: 0.2em 0.1em;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition:
    transform 120ms ease,
    filter 150ms ease;
}

.slot:hover:not(.slot--disabled) .slot__icon-wrap,
.slot--pending .slot__icon-wrap {
  transform: translateY(-3px);
  filter: brightness(1.2) drop-shadow(0 0 8px rgba(255, 210, 110, 0.75));
}

.slot:active:not(.slot--disabled) .slot__icon-wrap {
  transform: translateY(0) scale(0.95);
}

.slot__icon-wrap {
  position: relative;
  width: 100%;
  max-width: var(--slot-icon, 72px);
  aspect-ratio: 1;
  transition:
    transform 120ms ease,
    filter 150ms ease;
}

.slot__icon {
  width: 100%;
  height: 100%;
}

.slot__key {
  position: absolute;
  top: 2%;
  left: 2%;
  min-width: 1.35em;
  height: 1.35em;
  display: grid;
  place-items: center;
  border: 1px solid var(--c-border);
  border-radius: 4px;
  background: rgba(10, 5, 3, 0.9);
  font-size: 0.72em;
  font-weight: 700;
  color: var(--c-gold-bright);
}

.slot__cooldown {
  position: absolute;
  inset: 10%;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.62);
  font-family: var(--font-display);
  font-size: 1.7em;
  font-weight: 900;
  color: #fff;
  text-shadow: var(--shadow-text);
}

.slot__name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78em;
  font-weight: 700;
  color: var(--c-ink);
  text-shadow: var(--shadow-text);
}

.slot__cost {
  font-size: 0.7em;
  font-weight: 700;
  line-height: 1;
  color: var(--c-ink-dim);
}

.slot__cost--attack,
.slot__cost--support {
  color: #8cc0ff;
}

.slot__cost--item {
  color: var(--c-gold-bright);
}

.slot--disabled {
  cursor: not-allowed;
}

.slot--disabled .slot__icon {
  filter: grayscale(0.85) brightness(0.5);
}

.slot--disabled .slot__name,
.slot--disabled .slot__cost {
  opacity: 0.55;
}
</style>
