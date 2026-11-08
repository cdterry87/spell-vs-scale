<script setup>
import { computed, nextTick, useTemplateRef, watch } from 'vue';

const props = defineProps({
  entries: { type: Array, required: true },
  expanded: { type: Boolean, default: false },
});
const emit = defineEmits(['toggle']);

const QUIET = new Set(['mana-regen']);
const visible = computed(() => props.entries.filter((e) => !QUIET.has(e.type)));
const recent = computed(() => visible.value.slice(-3));
const listEl = useTemplateRef('list');

watch(
  () => [props.expanded, visible.value.length],
  async () => {
    if (!props.expanded) return;
    await nextTick();
    listEl.value?.scrollTo({ top: listEl.value.scrollHeight });
  },
);

const toneOf = (e) => {
  if (['victory', 'firestorm-charge', 'enrage'].includes(e.type)) return 'alert';
  if (e.type === 'defeat') return 'alert';
  if (e.type === 'heal' || e.type === 'mana' || e.type === 'cure') return 'good';
  return e.actor;
};
</script>

<template>
  <section class="log" :class="{ 'log--expanded': expanded }" aria-label="Battle log">
    <button
      type="button"
      class="log__toggle"
      :aria-expanded="expanded"
      aria-controls="battle-log-list"
      @click="emit('toggle')"
    >
      {{ expanded ? 'Hide log' : 'Log' }}
    </button>
    <ol v-if="expanded" id="battle-log-list" ref="list" class="log__list" tabindex="0">
      <li v-for="entry in visible" :key="entry.id" :class="`log__entry--${toneOf(entry)}`">
        <span class="log__round">R{{ entry.round }}</span> {{ entry.message }}
      </li>
    </ol>
    <TransitionGroup v-else tag="ol" name="feed" class="log__feed" aria-hidden="true">
      <li v-for="entry in recent" :key="entry.id" :class="`log__entry--${toneOf(entry)}`">
        {{ entry.message }}
      </li>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.log {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  max-width: min(36em, 52cqw);
  font-size: clamp(0.78rem, 2cqh, 1rem);
}

.log__toggle {
  padding: 0.15em 0.8em;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  background: rgba(16, 8, 5, 0.85);
  color: var(--c-gold-bright);
  font-weight: 700;
  cursor: pointer;
  order: 2;
}

.log__feed,
.log__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.log__feed li {
  width: fit-content;
  margin-top: 3px;
  padding: 0.15em 0.6em;
  border-radius: 4px;
  background: rgba(10, 5, 3, 0.68);
  text-shadow: 0 1px 2px #000;
  line-height: 1.3;
}

.log__feed li:not(:last-child) {
  opacity: 0.72;
}

.log__list {
  width: min(36em, 52cqw);
  max-height: 34cqh;
  overflow-y: auto;
  padding: 0.5em 0.75em;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: rgba(10, 5, 3, 0.92);
  line-height: 1.4;
}

.log__round {
  display: inline-block;
  min-width: 2.4em;
  color: var(--c-ink-muted);
  font-variant-numeric: tabular-nums;
}

.log__entry--wizard {
  color: #e4d8ff;
}
.log__entry--dragon {
  color: #ffc2a8;
}
.log__entry--good {
  color: #b9ffbf;
}
.log__entry--alert {
  color: var(--c-gold-bright);
  font-weight: 700;
}

.feed-enter-active {
  transition: all 220ms ease;
}
.feed-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.feed-leave-active {
  display: none;
}
</style>
