<script setup>
defineProps({
  items: { type: Array, required: true }, // [{ id, text, kind, offset }]
});
</script>

<template>
  <div class="floats" aria-hidden="true">
    <span
      v-for="item in items"
      :key="item.id"
      class="float"
      :class="`float--${item.kind}`"
      :style="{ left: `${50 + item.offset * 14}%` }"
    >
      {{ item.text }}
    </span>
  </div>
</template>

<style scoped>
.floats {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.float {
  position: absolute;
  top: 30%;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(1.3rem, 5cqh, 2.8rem);
  white-space: nowrap;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.7);
  text-shadow:
    0 3px 0 #000,
    0 0 12px rgba(0, 0, 0, 0.8);
  animation: float-up 1.35s ease-out forwards;
}

.float--damage {
  color: var(--c-damage);
}
.float--damage-wizard {
  color: var(--c-damage-wizard);
}
.float--burn {
  color: #ff9a4a;
  font-size: clamp(1.1rem, 4cqh, 2.2rem);
}
.float--heal {
  color: var(--c-heal);
}
.float--mana {
  color: #8cc0ff;
}
.float--miss {
  color: var(--c-miss);
  font-size: clamp(1rem, 3.6cqh, 2rem);
}
.float--status {
  color: #ffd6a0;
  font-size: clamp(1rem, 3.6cqh, 2rem);
}
.float--crystal {
  color: var(--c-crystal);
  font-size: clamp(1rem, 3.6cqh, 2rem);
}

@media (prefers-reduced-motion: reduce) {
  .float {
    animation: float-fade 1.35s linear forwards;
    transform: translateX(-50%);
  }
  @keyframes float-fade {
    0%,
    80% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
}
</style>
