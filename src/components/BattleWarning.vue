<script setup>
defineProps({
  warning: { type: Object, default: null }, // { id, text, tone }
});
</script>

<template>
  <div class="warning-layer" aria-hidden="true">
    <p v-if="warning" :key="warning.id" class="warning" :class="`warning--${warning.tone}`">
      {{ warning.text }}
    </p>
  </div>
</template>

<style scoped>
.warning-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 30;
}

.warning {
  position: absolute;
  top: 42%;
  left: 50%;
  margin: 0;
  padding: 0.35em 1.2em;
  border-top: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(10, 4, 2, 0.88) 15%,
    rgba(10, 4, 2, 0.88) 85%,
    transparent
  );
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(1.1rem, 4.4cqh, 2.4rem);
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow: var(--shadow-text);
  animation: warning-in 2.8s ease forwards;
}

.warning--fire {
  color: #ffb15a;
}
.warning--rage {
  color: #ff5a48;
}
.warning--ice {
  color: var(--c-crystal);
}

@media (prefers-reduced-motion: reduce) {
  .warning {
    animation: none;
    transform: translate(-50%, -50%);
  }
}
</style>
