<script setup>
/**
 * Full-bleed scene art. The art is drawn into a "stage" box that covers the viewport
 * while keeping the image's aspect ratio, so overlays placed in the default slot with
 * percentage coordinates stay aligned with features in the artwork at any crop.
 */
defineProps({
  src: { type: String, required: true },
  aspect: { type: Number, default: 1672 / 941 },
  focusX: { type: Number, default: 50 },
  focusY: { type: Number, default: 50 },
});
</script>

<template>
  <div class="scene-bg" aria-hidden="true">
    <div
      class="scene-bg__stage"
      :style="{
        '--aspect': aspect,
        '--fx': focusX,
        '--fy': focusY,
      }"
    >
      <img class="scene-bg__img" :src="src" alt="" draggable="false" />
      <slot />
    </div>
  </div>
</template>

<style scoped>
.scene-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #1a0b06;
  z-index: 0;
  pointer-events: none;
}

.scene-bg__stage {
  position: absolute;
  width: max(100cqw, calc(100cqh * var(--aspect)));
  height: max(100cqh, calc(100cqw / var(--aspect)));
  /* Shift the overflow according to the focal point (0–100). */
  left: calc((100cqw - max(100cqw, calc(100cqh * var(--aspect)))) * var(--fx) / 100);
  top: calc((100cqh - max(100cqh, calc(100cqw / var(--aspect)))) * var(--fy) / 100);
}

.scene-bg__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
