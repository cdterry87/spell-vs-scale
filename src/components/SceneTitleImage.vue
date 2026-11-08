<script setup>
/** Decorative lettering art with a real, visually hidden heading for assistive tech. */
defineProps({
  src: { type: String, required: true },
  text: { type: String, required: true },
  level: { type: Number, default: 1 },
});
</script>

<template>
  <div class="scene-title">
    <component :is="`h${level}`" class="visually-hidden">{{ text }}</component>
    <img class="scene-title__img" :src="src" alt="" aria-hidden="true" draggable="false" />
  </div>
</template>

<style scoped>
.scene-title {
  pointer-events: none;
}
.scene-title__img {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.65));
}
</style>
