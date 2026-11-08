<script setup>
import { useTemplateRef } from 'vue';
import { useDialogFocus } from '../composables/useDialogFocus.js';

const emit = defineEmits(['resume', 'request-restart', 'request-main-menu']);
const root = useTemplateRef('root');
const { onKeydown } = useDialogFocus(root, () => emit('resume'));
</script>

<template>
  <div class="overlay" @click.self="emit('resume')">
    <div
      ref="root"
      class="menu panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-title"
      @keydown="onKeydown"
    >
      <h2 id="menu-title" class="menu__title">Paused</h2>
      <button type="button" class="btn" @click="emit('resume')">Resume</button>
      <button type="button" class="btn btn--quiet" @click="emit('request-restart')">
        Restart Battle
      </button>
      <button type="button" class="btn btn--quiet" @click="emit('request-main-menu')">
        Main Menu
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(320px, 100%);
  padding: 18px 22px 22px;
}

.menu__title {
  margin: 0 0 4px;
  text-align: center;
  font-family: var(--font-display);
  color: var(--c-gold-bright);
  font-size: 1.5rem;
  letter-spacing: 0.08em;
}
</style>
