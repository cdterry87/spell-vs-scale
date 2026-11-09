<script setup>
import { onMounted, useTemplateRef } from 'vue';
import SceneBackground from './SceneBackground.vue';
import SceneTitleImage from './SceneTitleImage.vue';
import MenuAtmosphere from './MenuAtmosphere.vue';
import menuBackground from '../../images/menu_background.webp';
import menuTitle from '../../images/menu_title.webp';

const emit = defineEmits(['play']);
const playButton = useTemplateRef('play');
onMounted(() => playButton.value?.focus({ preventScroll: true }));
</script>

<template>
  <main class="scene menu">
    <SceneBackground :src="menuBackground" :focus-x="55" :focus-y="60" />
    <MenuAtmosphere />
    <div class="menu__vignette" aria-hidden="true" />
    <div class="menu__content">
      <SceneTitleImage class="menu__title" :src="menuTitle" text="Spell vs Scale" />
      <p class="menu__tagline">One wizard. One dragon. Only one leaves the cavern.</p>
      <p class="menu__credit">
        Developed by Chase Terry. See more at
        <a href="https://chaseterry.com" target="_blank" rel="noopener">chaseterry.com</a>
      </p>
      <button ref="play" type="button" class="btn btn--primary menu__play" @click="emit('play')">
        Play
      </button>
    </div>
  </main>
</template>

<style scoped>
.menu__vignette {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(0, 0, 0, 0.35), transparent 60%),
    linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.35),
      transparent 35%,
      transparent 70%,
      rgba(0, 0, 0, 0.55)
    );
}

.menu__content {
  position: relative;
  z-index: 3;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: max(3cqh, 12px) 16px max(6cqh, 16px);
  gap: clamp(8px, 2.5cqh, 28px);
}

.menu__title {
  width: min(70cqw, 115cqh, 980px);
}

.menu__tagline {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(0.85rem, 2.4cqh, 1.35rem);
  color: var(--c-ink);
  text-shadow: var(--shadow-text);
  text-align: center;
  letter-spacing: 0.04em;
}

.menu__credit {
  margin: calc(-1 * clamp(4px, 1.5cqh, 18px)) 0 0;
  font-size: clamp(0.8rem, 2cqh, 1.05rem);
  color: var(--c-ink-dim);
  text-shadow: var(--shadow-text);
  text-align: center;
}

.menu__credit a {
  color: var(--c-gold-bright);
  font-weight: 700;
  text-underline-offset: 3px;
}

.menu__credit a:hover {
  color: #fff;
}

.menu__play {
  margin-top: auto;
}
</style>
