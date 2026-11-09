<script setup>
import { computed, ref, watch } from 'vue';
import { createRng } from '../game/combat.js';

/**
 * A single combatant illustration with CSS-only presentation states.
 * `images` maps pose → src; a missing pose falls back to `idle`.
 *
 * Visual states compose through CSS custom properties on the figure:
 * --tint (color filters), --glow (drop-shadow halo) and --fade (opacity).
 * Later rules in this file win when states overlap (e.g. Frozen beats Enraged).
 */
const props = defineProps({
  character: { type: String, required: true },
  label: { type: String, required: true },
  side: { type: String, default: 'left' }, // left faces right; right faces left
  pose: { type: String, default: 'idle' }, // idle | attack | cast | defeated
  images: { type: Object, required: true },
  hitCount: { type: Number, default: 0 },
  frozen: { type: Boolean, default: false }, // encased in ice: tinted, still, shimmering
  burning: { type: Boolean, default: false }, // reddish tint with rising embers
  obscured: { type: Boolean, default: false }, // pale and translucent (the dragon is Blind)
  aura: { type: String, default: null }, // null | arcane | heal | cure | mana
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

/* Deterministic particle layouts (percent of the sprite box), fixed per character. */
const rng = createRng(props.character === 'dragon' ? 101 : 202);
const embers = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: 14 + rng() * 72,
  bottom: 4 + rng() * 40,
  size: 8 + rng() * 8,
  duration: 1.8 + rng() * 1.6,
  delay: -rng() * 3.4,
  drift: (rng() - 0.5) * 50,
}));
const sparkles = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: 12 + rng() * 76,
  top: 8 + rng() * 80,
  size: 12 + rng() * 14,
  delay: rng() * 0.9,
}));

const showSparkles = computed(() => ['heal', 'cure', 'mana'].includes(props.aura));
</script>

<template>
  <figure
    class="sprite"
    :class="[
      `sprite--${character}`,
      `sprite--${side}`,
      `sprite--${pose}`,
      aura && `sprite--aura-${aura}`,
      {
        'sprite--hit': flashing,
        'sprite--frozen': frozen,
        'sprite--burning': burning,
        'sprite--obscured': obscured,
      },
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
    <!-- Ice tint and shimmer, masked to the current artwork's silhouette. -->
    <span class="sprite__ice" :style="{ '--sprite-mask': `url(${src})` }" aria-hidden="true" />

    <div v-if="burning" class="sprite__fx sprite__fx--burn" aria-hidden="true">
      <span
        v-for="e in embers"
        :key="`e${e.id}`"
        class="sprite__ember"
        :style="{
          left: `${e.left}%`,
          bottom: `${e.bottom}%`,
          '--size': `${e.size}px`,
          '--drift': `${e.drift}px`,
          animationDuration: `${e.duration}s`,
          animationDelay: `${e.delay}s`,
        }"
      />
    </div>

    <div v-if="showSparkles" class="sprite__fx" aria-hidden="true">
      <span
        v-for="s in sparkles"
        :key="`s${s.id}`"
        class="sprite__sparkle"
        :style="{
          left: `${s.left}%`,
          top: `${s.top}%`,
          width: `${s.size}px`,
          height: `${s.size}px`,
          animationDelay: `${s.delay}s`,
        }"
      />
    </div>
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
  opacity: var(--fade, 1);
  filter: var(--tint,) var(--glow,) drop-shadow(0 18px 18px rgba(0, 0, 0, 0.55));
  transition:
    filter 450ms ease,
    opacity 450ms ease;
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

.sprite--hit .sprite__img {
  animation: hit-flash 320ms ease-out;
}

.sprite--hit.sprite--left {
  transform: translateX(-2%);
}

.sprite--hit.sprite--right {
  transform: translateX(2%);
}

/* ---------- state layers (order = priority) ---------- */

.sprite--enraged {
  --glow: drop-shadow(0 0 22px rgba(255, 40, 20, 0.85));
}

.sprite--crystal {
  --glow: drop-shadow(0 0 14px rgba(150, 225, 255, 0.95));
}

.sprite--burning {
  --tint: sepia(0.55) saturate(2) hue-rotate(-22deg) brightness(1.03);
  --glow: drop-shadow(0 0 14px rgba(255, 96, 24, 0.8));
}

/* The dragon is Blind: the wizard is hard to make out. */
.sprite--obscured {
  --tint: grayscale(0.85) brightness(1.5) contrast(0.7) blur(0.6px);
  --fade: 0.5;
}

.sprite--aura-arcane {
  --aura-rgb: 170, 120, 255;
}
.sprite--aura-heal {
  --aura-rgb: 110, 255, 120;
}
.sprite--aura-cure {
  --aura-rgb: 60, 235, 215;
}
.sprite--aura-mana {
  --aura-rgb: 80, 155, 255;
}

.sprite[class*='sprite--aura-'] {
  --glow: drop-shadow(0 0 10px rgba(var(--aura-rgb), 0.95))
    drop-shadow(0 0 26px rgba(var(--aura-rgb), 0.6));
}

.sprite--frozen {
  --tint: saturate(0.7) brightness(0.98) contrast(1.12);
  --glow: drop-shadow(0 0 6px rgba(190, 235, 255, 0.95))
    drop-shadow(0 0 22px rgba(110, 190, 255, 0.6));
}

/* Frozen solid: no breathing. */
.sprite--frozen .sprite__img {
  animation: none;
}

/* ---------- ice overlay ---------- */

.sprite__ice {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 400ms ease;
  -webkit-mask: var(--sprite-mask) left bottom / auto 100% no-repeat;
  mask: var(--sprite-mask) left bottom / auto 100% no-repeat;
}

.sprite__ice::before,
.sprite__ice::after {
  content: '';
  position: absolute;
  inset: 0;
}

/* Cold blue tint over the creature. */
.sprite__ice::before {
  background:
    radial-gradient(ellipse at 30% 25%, rgba(225, 245, 255, 0.35), transparent 55%),
    linear-gradient(160deg, rgba(120, 200, 255, 0.6), rgba(40, 110, 220, 0.55));
  mix-blend-mode: color;
}

/* A bright band of light sweeping across the ice. */
.sprite__ice::after {
  background: linear-gradient(
    115deg,
    transparent 38%,
    rgba(220, 245, 255, 0.15) 44%,
    rgba(255, 255, 255, 0.75) 50%,
    rgba(220, 245, 255, 0.15) 56%,
    transparent 62%
  );
  background-size: 300% 100%;
  background-position: 150% 0;
  mix-blend-mode: screen;
}

.sprite--frozen .sprite__ice {
  opacity: 1;
}

.sprite--frozen .sprite__ice::after {
  animation: ice-shimmer 2.8s ease-in-out infinite;
}

@keyframes ice-shimmer {
  0% {
    background-position: 150% 0;
  }
  55%,
  100% {
    background-position: -50% 0;
  }
}

/* ---------- particles ---------- */

.sprite__fx {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Smouldering heat glow around the burning body. */
.sprite__fx--burn::before {
  content: '';
  position: absolute;
  inset: 10% 5% -5%;
  background: radial-gradient(
    ellipse 50% 45% at 50% 70%,
    rgba(255, 120, 30, 0.45),
    rgba(255, 60, 10, 0.18) 55%,
    transparent 75%
  );
  mix-blend-mode: screen;
  animation: pulse-glow 1.1s ease-in-out infinite;
}

/* Each ember is a tall invisible track; the glowing dot rides up it via transform. */
.sprite__ember {
  position: absolute;
  width: var(--size);
  height: 70%;
  animation: sprite-ember linear infinite;
  will-change: transform, opacity;
}

.sprite__ember::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #fffbe0 0%,
    #ffc04a 40%,
    #ff6a1a 65%,
    rgba(255, 60, 10, 0) 80%
  );
  box-shadow:
    0 0 10px 3px rgba(255, 140, 40, 0.9),
    0 0 22px 6px rgba(255, 70, 10, 0.45);
}

@keyframes sprite-ember {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--drift), -70%) scale(0.35);
    opacity: 0;
  }
}

.sprite__sparkle {
  position: absolute;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  background:
    linear-gradient(90deg, transparent 0 45%, #fff 50%, transparent 55% 100%),
    linear-gradient(0deg, transparent 0 45%, #fff 50%, transparent 55% 100%),
    radial-gradient(
      circle,
      rgba(255, 255, 255, 0.95) 0 10%,
      rgba(var(--aura-rgb), 0.6) 22%,
      transparent 48%
    );
  filter: drop-shadow(0 0 4px rgba(var(--aura-rgb), 1));
  animation: sprite-sparkle 0.9s ease-in-out infinite;
}

@keyframes sprite-sparkle {
  0%,
  100% {
    opacity: 0;
    transform: translate(-50%, -20%) scale(0) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -60%) scale(1) rotate(45deg);
  }
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
  .sprite__ice::after {
    animation: none !important;
    background-position: 50% 0;
    opacity: 0.5;
  }
  .sprite__ember,
  .sprite__sparkle {
    animation: none !important;
  }
  .sprite__ember {
    opacity: 0.8;
  }
  .sprite__sparkle {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(0.7);
  }
}
</style>
