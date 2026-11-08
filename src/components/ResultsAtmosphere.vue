<script setup>
/**
 * Victory: glints authored at coin/treasure positions in victory_background (percent of image).
 * Defeat: soft beams from the top of the scene converging on the grave.
 * Must be rendered inside SceneBackground so coordinates track the artwork's crop.
 */
defineProps({
  variant: { type: String, required: true, validator: (v) => ['victory', 'defeat'].includes(v) },
});

// [x%, y%, size px, delay s]
const GLINTS = [
  [13.5, 52.5, 26, 0],
  [19, 59, 18, 1.7],
  [26, 54, 22, 3.1],
  [31, 60, 16, 0.8],
  [38, 63, 20, 2.4],
  [34.5, 72.5, 22, 4.2],
  [23, 82, 18, 1.2],
  [30, 86, 24, 3.6],
  [42, 84, 16, 0.4],
  [48, 88, 20, 2.9],
  [19.5, 88, 22, 5.1],
  [26, 93, 18, 2.0],
  [72, 63, 20, 1.5],
  [80, 66, 16, 3.3],
  [88, 68, 22, 0.6],
  [77, 31, 24, 2.2],
  [76.5, 87, 18, 4.6],
  [84, 90, 20, 1.0],
  [93, 82, 16, 3.9],
  [58, 76, 14, 2.7],
];

// Beam origin x% at the top and rotation (deg) so each falls on the grave (~56%, 62%).
const BEAMS = [
  { x: 60, angle: 6.5, length: 66, width: 7, delay: 0, duration: 9 },
  { x: 66, angle: 16, length: 67, width: 10, delay: -3, duration: 11 },
  { x: 72, angle: 24.5, length: 70, width: 6, delay: -6, duration: 13 },
  { x: 63, angle: 11, length: 66, width: 4, delay: -1.5, duration: 7 },
];
</script>

<template>
  <div class="results-atmos" aria-hidden="true">
    <template v-if="variant === 'victory'">
      <span
        v-for="([x, y, size, delay], i) in GLINTS"
        :key="i"
        class="glint"
        :style="{
          left: `${x}%`,
          top: `${y}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDelay: `${delay}s`,
          animationDuration: `${3.2 + (i % 4) * 0.7}s`,
        }"
      />
    </template>
    <template v-else>
      <span
        v-for="(beam, i) in BEAMS"
        :key="i"
        class="beam"
        :style="{
          left: `${beam.x}%`,
          height: `${beam.length}%`,
          width: `${beam.width}%`,
          '--angle': `${beam.angle}deg`,
          animationDelay: `${beam.delay}s`,
          animationDuration: `${beam.duration}s`,
        }"
      />
      <span class="grave-glow" />
    </template>
  </div>
</template>

<style scoped>
.results-atmos {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Four-point star glint built from two crossed gradients. */
.glint {
  position: absolute;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  background:
    linear-gradient(90deg, transparent 0 46%, #fffbe6 50%, transparent 54% 100%),
    linear-gradient(0deg, transparent 0 46%, #fffbe6 50%, transparent 54% 100%),
    radial-gradient(
      circle,
      rgba(255, 246, 200, 0.95) 0 12%,
      rgba(255, 210, 90, 0.35) 22%,
      transparent 45%
    );
  filter: drop-shadow(0 0 4px rgba(255, 220, 120, 0.9));
  animation: glint ease-in-out infinite;
  will-change: transform, opacity;
}

@keyframes glint {
  0%,
  62%,
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0) rotate(0deg);
  }
  72% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(25deg);
  }
  84% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2) rotate(45deg);
  }
}

.beam {
  position: absolute;
  top: -4%;
  transform-origin: 50% 0;
  transform: translateX(-50%) rotate(var(--angle));
  background: linear-gradient(
    180deg,
    rgba(255, 244, 220, 0.38) 0%,
    rgba(255, 236, 200, 0.18) 55%,
    rgba(255, 230, 190, 0) 100%
  );
  filter: blur(6px);
  mix-blend-mode: screen;
  opacity: 0.5;
  animation: beam-shift ease-in-out infinite alternate;
  will-change: transform, opacity;
}

@keyframes beam-shift {
  0% {
    opacity: 0.35;
    transform: translateX(-50%) rotate(calc(var(--angle) - 1.5deg));
  }
  100% {
    opacity: 0.8;
    transform: translateX(-50%) rotate(calc(var(--angle) + 1.5deg));
  }
}

.grave-glow {
  position: absolute;
  left: 53%;
  top: 60%;
  width: 26%;
  height: 22%;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse, rgba(255, 236, 200, 0.28), transparent 70%);
  mix-blend-mode: screen;
  animation: pulse-glow 7s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .glint {
    animation: none;
    opacity: 0.85;
    transform: translate(-50%, -50%) scale(0.6);
  }
  .glint:nth-child(3n + 1) {
    opacity: 0;
  }
  .beam,
  .grave-glow {
    animation: none;
  }
}
</style>
