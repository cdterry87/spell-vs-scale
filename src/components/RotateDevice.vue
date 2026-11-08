<script setup>
import { ref } from 'vue';

/** Recommends landscape on small portrait screens. Dismissible; never locks orientation. */
const dismissed = ref(false);
</script>

<template>
  <div
    v-if="!dismissed"
    class="rotate"
    role="dialog"
    aria-modal="false"
    aria-labelledby="rotate-title"
  >
    <div class="rotate__card panel">
      <div class="rotate__icon" aria-hidden="true">⟳</div>
      <h2 id="rotate-title">Rotate your device for the best experience</h2>
      <p>Spell vs Scale is designed for landscape screens.</p>
      <button type="button" class="btn btn--quiet" @click="dismissed = true">
        Continue anyway
      </button>
    </div>
  </div>
</template>

<style scoped>
.rotate {
  display: none;
}

@media (orientation: portrait) and (max-width: 820px) {
  .rotate {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(10, 4, 2, 0.94);
  }
}

.rotate__card {
  max-width: 340px;
  padding: 22px;
  text-align: center;
}

.rotate__card h2 {
  margin: 8px 0;
  font-family: var(--font-display);
  font-size: 1.2rem;
  color: var(--c-gold-bright);
}

.rotate__card p {
  margin: 0 0 16px;
  color: var(--c-ink-dim);
}

.rotate__icon {
  font-size: 2.6rem;
  color: var(--c-gold);
  animation: spin 2.4s ease-in-out infinite;
}

@keyframes spin {
  0%,
  30% {
    transform: rotate(0);
  }
  60%,
  100% {
    transform: rotate(90deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rotate__icon {
    animation: none;
  }
}
</style>
