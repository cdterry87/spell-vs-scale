<script setup>
import { useTemplateRef } from 'vue';
import { useDialogFocus } from '../composables/useDialogFocus.js';

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirm' },
});
const emit = defineEmits(['confirm', 'cancel']);
const root = useTemplateRef('root');
const { onKeydown } = useDialogFocus(root, () => emit('cancel'));
</script>

<template>
  <div class="overlay" @click.self="emit('cancel')">
    <div
      ref="root"
      class="dialog panel"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      @keydown="onKeydown"
    >
      <h2 id="confirm-title" class="dialog__title">{{ title }}</h2>
      <p id="confirm-desc" class="dialog__desc">{{ description }}</p>
      <div class="dialog__actions">
        <button type="button" class="btn btn--quiet" @click="emit('cancel')">Cancel</button>
        <button type="button" class="btn" @click="emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
}

.dialog {
  width: min(420px, 100%);
  padding: 20px 22px;
  text-align: center;
}

.dialog__title {
  margin: 0;
  font-family: var(--font-display);
  color: var(--c-gold-bright);
  font-size: 1.35rem;
}

.dialog__desc {
  margin: 8px 0 18px;
  color: var(--c-ink-dim);
}

.dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.dialog__actions .btn {
  min-width: 8em;
}
</style>
