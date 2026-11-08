import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createRng } from '../game/combat.js';

/** Tracks prefers-reduced-motion for the lifetime of a component. */
export function useReducedMotion() {
  const reduced = ref(false);
  let query = null;
  const update = () => (reduced.value = !!query?.matches);
  onMounted(() => {
    query = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
    update();
    query?.addEventListener?.('change', update);
  });
  onBeforeUnmount(() => query?.removeEventListener?.('change', update));
  return reduced;
}

/**
 * Deterministic decorative particles: a fixed list generated from a seed so every
 * mount starts fresh and identical, with no timers mutating state.
 */
export function createEmbers(count = 18, seed = 7) {
  const rng = createRng(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: 4 + rng() * 92, // % across the scene
    size: 3 + rng() * 5, // px
    duration: 7 + rng() * 7, // s
    delay: -rng() * 14, // s, negative so the field starts populated
    drift: (rng() - 0.5) * 80, // px sideways sway
  }));
}

export function createFogLayers() {
  return [
    { id: 0, top: 58, height: 34, duration: 34, opacity: 0.32, reverse: false },
    { id: 1, top: 70, height: 30, duration: 24, opacity: 0.28, reverse: true },
    { id: 2, top: 40, height: 22, duration: 29, opacity: 0.16, reverse: false },
  ];
}
