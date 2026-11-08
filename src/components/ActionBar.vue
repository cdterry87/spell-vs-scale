<script setup>
import { computed, ref } from 'vue';
import SpellButton from './SpellButton.vue';
import menuIcon from '../assets/icons/menu.webp';

const props = defineProps({
  actions: { type: Array, required: true },
  inputEnabled: { type: Boolean, default: false },
});
const emit = defineEmits(['select-action', 'open-menu']);

const previewId = ref(null);
const touchPendingId = ref(null);

const preview = computed(() => props.actions.find((a) => a.id === previewId.value) ?? null);

function detailLine(action) {
  const bits = [];
  if (action.damage) bits.push(`${action.damage[0]}–${action.damage[1]} damage`);
  if (action.heal) bits.push(`${action.heal[0]}–${action.heal[1]} healing`);
  return bits.join(' · ');
}

function onSelect(id) {
  touchPendingId.value = null;
  emit('select-action', id);
}

function onTouchPreview(id) {
  previewId.value = id;
  touchPendingId.value = id;
}

function clearPreview() {
  previewId.value = null;
  touchPendingId.value = null;
}
</script>

<template>
  <nav class="action-bar" aria-label="Actions" @mouseleave="previewId = touchPendingId">
    <div v-if="preview" class="action-detail panel" role="status" aria-live="polite">
      <div class="action-detail__head">
        <strong>{{ preview.name }}</strong>
        <span v-if="preview.kind === 'item'">{{ preview.charges }} left</span>
        <span v-else>{{ preview.mpCost ? `${preview.mpCost} MP` : 'Free' }}</span>
        <span v-if="preview.cooldown" class="action-detail__muted"
          >Cooldown {{ preview.cooldown }}</span
        >
      </div>
      <p class="action-detail__line">
        <span v-if="detailLine(preview)" class="action-detail__range"
          >{{ detailLine(preview) }} —
        </span>
        {{ preview.description }}
      </p>
      <p v-if="!preview.available && preview.disabledReason" class="action-detail__reason">
        {{ preview.disabledReason }}
      </p>
      <p v-else-if="touchPendingId === preview.id" class="action-detail__hint">
        Tap again to cast.
      </p>
    </div>

    <div class="action-bar__slots">
      <SpellButton
        v-for="action in actions"
        :key="action.id"
        :action="action"
        :pending="touchPendingId === action.id"
        @select="onSelect"
        @touch-preview="onTouchPreview"
        @preview="previewId = $event"
        @blur="clearPreview"
      />
      <button
        type="button"
        class="menu-slot"
        aria-label="Open menu"
        aria-keyshortcuts="Escape"
        @click="emit('open-menu')"
      >
        <img :src="menuIcon" alt="" draggable="false" />
        <span aria-hidden="true">Menu</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.action-bar {
  position: relative;
  height: 100%;
}

.action-bar__slots {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  align-items: center;
  gap: 0.3em;
  height: 100%;
}

.menu-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15em;
  padding: 0.2em 0.1em;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
}

.menu-slot img {
  width: 100%;
  max-width: calc(var(--slot-icon, 72px) * 0.82);
  aspect-ratio: 1;
  transition: filter 150ms ease;
}

.menu-slot:hover img {
  filter: brightness(1.25);
}

.menu-slot span {
  font-size: 0.78em;
  font-weight: 700;
  text-shadow: var(--shadow-text);
}

.action-detail {
  position: absolute;
  bottom: calc(100% + 1.4em);
  left: 50%;
  transform: translateX(-50%);
  width: min(30em, 100%);
  padding: 0.6em 0.9em;
  font-size: 0.95em;
  pointer-events: none;
  z-index: 5;
}

.action-detail__head {
  display: flex;
  gap: 0.8em;
  align-items: baseline;
  font-family: var(--font-display);
  color: var(--c-gold-bright);
}

.action-detail__head span {
  font-family: var(--font-body);
  font-weight: 700;
  color: #8cc0ff;
}

.action-detail__head .action-detail__muted {
  color: var(--c-ink-dim);
}

.action-detail__line,
.action-detail__reason,
.action-detail__hint {
  margin: 0.25em 0 0;
  line-height: 1.35;
}

.action-detail__range {
  font-weight: 700;
  color: var(--c-damage);
}

.action-detail__reason {
  color: #ff9b8a;
  font-weight: 700;
}

.action-detail__hint {
  color: var(--c-gold-bright);
}
</style>
