<script setup>
import { computed, ref, watch } from 'vue';

/**
 * A single combatant illustration with CSS-only presentation states.
 * `images` maps pose → src; a missing pose falls back to `idle`.
 */
const props = defineProps({
  character: { type: String, required: true },
  label: { type: String, required: true },
  side: { type: String, default: 'left' }, // left faces right; right faces left
  pose: { type: String, default: 'idle' }, // idle | attack | cast | defeated
  images: { type: Object, required: true },
  hitCount: { type: Number, default: 0 },
});

const src = computed(() => props.images[props.pose] ?? props.images.idle);
const flashing = ref(false);
let flashTimer = null;
watch(
  () => props.hitCount,
  () => {
    flashing.value = false;
    clearTimeout(flashTimer);
    requestAnimationFrame(() => {
      flashing.value = true;
      flashTimer = setTimeout(() => (flashing.value = false), 320);
    });
  },
);
</script>

<template>
  <figure
    class="sprite"
    :class="[
      `sprite--${character}`,
      `sprite--${side}`,
      `sprite--${pose}`,
      { 'sprite--hit': flashing },
    ]"
    :aria-label="label"
  >
    <img
      v-for="(imgSrc, key) in images"
      v-show="imgSrc === src"
      :key="key"
      class="sprite__img"
      :class="`sprite__img--${key}`"
      :src="imgSrc"
      alt=""
      draggable="false"
    />
    <slot />
  </figure>
</template>

<style scoped>
.sprite {
  position: absolute;
  margin: 0;
  pointer-events: none;
  transition:
    transform 260ms cubic-bezier(0.2, 0.8, 0.3, 1.2),
    opacity 900ms ease,
    filter 900ms ease;
}

.sprite__img {
  position: absolute;
  bottom: 0;
  width: auto;
  max-width: none;
  filter: drop-shadow(0 18px 18px rgba(0, 0, 0, 0.55));
}

.sprite--idle .sprite__img {
  transform-origin: 50% 100%;
  animation: idle-breathe 4.2s ease-in-out infinite;
}

.sprite--left.sprite--attack {
  transform: translateX(3%);
}

.sprite--right.sprite--attack {
  transform: translateX(-5%) scale(1.03);
}

.sprite--cast .sprite__img {
  filter: drop-shadow(0 0 18px rgba(170, 120, 255, 0.95))
    drop-shadow(0 18px 18px rgba(0, 0, 0, 0.55));
}

.sprite--hit .sprite__img {
  animation: hit-flash 320ms ease-out;
}

.sprite--hit.sprite--left {
  transform: translateX(-2%);
}

.sprite--hit.sprite--right {
  transform: translateX(2%);
}

.sprite--defeated {
  opacity: 0.25;
  filter: grayscale(0.9) brightness(0.5);
  transform: translateY(4%);
}

@media (prefers-reduced-motion: reduce) {
  .sprite,
  .sprite__img {
    animation: none !important;
    transition: opacity 200ms ease;
  }
  .sprite--attack,
  .sprite--hit {
    transform: none !important;
  }
}
</style>
