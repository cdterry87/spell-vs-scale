<script setup>
import { createEmbers, createFogLayers } from '../composables/useSceneAtmosphere.js';

const fog = createFogLayers();
const embers = createEmbers(20);
</script>

<template>
  <div class="menu-atmos" aria-hidden="true">
    <div
      v-for="layer in fog"
      :key="`fog-${layer.id}`"
      class="fog"
      :class="{ 'fog--reverse': layer.reverse }"
      :style="{
        top: `${layer.top}%`,
        height: `${layer.height}%`,
        opacity: layer.opacity,
        animationDuration: `${layer.duration}s`,
      }"
    />
    <span
      v-for="ember in embers"
      :key="`ember-${ember.id}`"
      class="ember"
      :style="{
        left: `${ember.left}%`,
        width: `${ember.size}px`,
        height: `${ember.size}px`,
        animationDuration: `${ember.duration}s`,
        animationDelay: `${ember.delay}s`,
        '--drift': `${ember.drift}px`,
      }"
    />
  </div>
</template>

<style scoped>
.menu-atmos {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

/* Each fog strip is twice the scene width with a repeating soft pattern, translated by half. */
.fog {
  position: absolute;
  left: 0;
  width: 200%;
  background:
    radial-gradient(ellipse 18% 48% at 12% 55%, rgba(255, 226, 210, 0.85), transparent 70%),
    radial-gradient(ellipse 22% 40% at 34% 45%, rgba(255, 210, 190, 0.7), transparent 70%),
    radial-gradient(ellipse 16% 50% at 62% 60%, rgba(255, 226, 210, 0.8), transparent 70%),
    radial-gradient(ellipse 22% 44% at 84% 48%, rgba(255, 210, 190, 0.7), transparent 70%);
  background-size: 50% 100%;
  filter: blur(18px);
  animation: fog-drift linear infinite;
  will-change: transform;
}

.fog--reverse {
  animation-direction: reverse;
}

@keyframes fog-drift {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

.ember {
  position: absolute;
  bottom: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff3c4 0%, #ffb340 45%, rgba(255, 80, 20, 0) 75%);
  box-shadow: 0 0 8px 2px rgba(255, 140, 40, 0.65);
  opacity: 0;
  animation: ember-rise ease-in infinite;
  will-change: transform, opacity;
}

@keyframes ember-rise {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  60% {
    opacity: 0.85;
  }
  100% {
    transform: translate(var(--drift), -78cqh) scale(0.4);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fog,
  .ember {
    animation: none;
  }
  .ember {
    display: none;
  }
}
</style>
