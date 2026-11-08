<script setup>
import { computed } from 'vue';
import { useGameStore } from './stores/game.js';
import MainMenuScreen from './components/MainMenuScreen.vue';
import BattleScreen from './components/BattleScreen.vue';
import BattleResults from './components/BattleResults.vue';
import RotateDevice from './components/RotateDevice.vue';

const game = useGameStore();
const resultVariant = computed(() => (game.winner === 'wizard' ? 'victory' : 'defeat'));
</script>

<template>
  <Transition name="scene-fade" mode="out-in">
    <MainMenuScreen v-if="game.screen === 'title'" key="title" @play="game.startGame()" />
    <BattleScreen v-else-if="game.screen === 'battle'" :key="`battle-${game.battleId}`" />
    <BattleResults
      v-else
      key="results"
      :variant="resultVariant"
      :statistics="game.battle.statistics"
      @rematch="game.startGame()"
      @main-menu="game.returnToTitle()"
    />
  </Transition>
  <RotateDevice />
</template>

<style>
.scene-fade-enter-active,
.scene-fade-leave-active {
  transition: opacity 450ms ease;
}
.scene-fade-enter-from,
.scene-fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .scene-fade-enter-active,
  .scene-fade-leave-active {
    transition-duration: 1ms;
  }
}
</style>
