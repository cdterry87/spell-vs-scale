<script setup>
import { STATUS_DEFS } from '../game/statusEffects.js';

/** Negative statuses, immunities and positive buffs as labelled badges (not color-only). */
defineProps({
  effects: { type: Array, default: () => [] },
  immunities: { type: Array, default: () => [] },
  buffs: { type: Array, default: () => [] }, // [{ id, name, symbol, detail, tone }]
  compact: { type: Boolean, default: false },
});

const turns = (n) => `${n} turn${n === 1 ? '' : 's'}`;
</script>

<template>
  <ul class="statuses" :class="{ 'statuses--compact': compact }" aria-label="Status effects">
    <li
      v-for="buff in buffs"
      :key="`buff-${buff.id}`"
      class="badge"
      :class="`badge--${buff.tone}`"
      :title="buff.detail"
    >
      <span aria-hidden="true">{{ buff.symbol }}</span>
      <span class="badge__name">{{ buff.name }}</span>
      <span v-if="buff.count != null" class="badge__count">{{ buff.count }}</span>
      <span class="visually-hidden">: {{ buff.detail }}</span>
    </li>
    <li
      v-for="status in effects"
      :key="status.id"
      class="badge badge--negative"
      :class="`badge--${status.id}`"
      :title="`${STATUS_DEFS[status.id].name}: ${STATUS_DEFS[status.id].description} ${turns(status.remainingAffectedTurns)} left.`"
    >
      <span aria-hidden="true">{{ STATUS_DEFS[status.id].symbol }}</span>
      <span class="badge__name">{{ STATUS_DEFS[status.id].name }}</span>
      <span class="badge__count">{{ status.remainingAffectedTurns }}</span>
      <span class="visually-hidden">
        : {{ STATUS_DEFS[status.id].description }} {{ turns(status.remainingAffectedTurns) }} left.
      </span>
    </li>
    <li
      v-for="immunity in immunities"
      :key="`imm-${immunity.statusId}`"
      class="badge badge--immune"
      :title="`Immune to ${STATUS_DEFS[immunity.statusId].name} until the end of the next turn.`"
    >
      <span aria-hidden="true">🛡</span>
      <span class="badge__name">{{ STATUS_DEFS[immunity.statusId].name }}</span>
      <span class="visually-hidden">immunity</span>
    </li>
  </ul>
</template>

<style scoped>
.statuses {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  min-height: 1.6em;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  padding: 0.12em 0.5em;
  border-radius: 999px;
  border: 1px solid currentColor;
  background: rgba(0, 0, 0, 0.72);
  font-size: 0.78em;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
}

.badge__count {
  display: inline-grid;
  place-items: center;
  min-width: 1.3em;
  height: 1.3em;
  border-radius: 50%;
  background: currentColor;
  color: #120806;
  font-size: 0.85em;
}

.badge--burn {
  color: #ff9a4a;
}
.badge--blind {
  color: #d8c6ff;
}
.badge--freeze {
  color: #9fe3ff;
}
.badge--stun {
  color: #ffe36a;
}
.badge--immune {
  color: #b8c4cf;
  border-style: dashed;
}
.badge--rage {
  color: var(--c-enrage);
  animation: pulse-glow 1.4s ease-in-out infinite;
}
.badge--crystal {
  color: var(--c-crystal);
}
.badge--fire {
  color: var(--c-warning);
  animation: pulse-glow 0.9s ease-in-out infinite;
}

.statuses--compact .badge__name {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .badge {
    animation: none !important;
  }
}
</style>
