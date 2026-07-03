<template>
  <span>{{ formattedValue }}</span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";

const props = defineProps({
  value: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 800
  }
});

const displayValue = ref(0);
let animationFrame: number | null = null;
let startTime: number | null = null;
let startValue = 0;

const formattedValue = computed(() => {
  return displayValue.value.toLocaleString();
});

const easeOutQuad = (t: number) => t * (2 - t);

const animate = (timestamp: number) => {
  if (!startTime) startTime = timestamp;
  const progress = timestamp - startTime;
  const percentage = Math.min(progress / props.duration, 1);
  const easedPercentage = easeOutQuad(percentage);
  
  displayValue.value = Math.round(startValue + (props.value - startValue) * easedPercentage);
  
  if (percentage < 1) {
    animationFrame = requestAnimationFrame(animate);
  } else {
    displayValue.value = props.value;
  }
};

watch(() => props.value, () => {
  startValue = displayValue.value;
  startTime = null;
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  animationFrame = requestAnimationFrame(animate);
});

onMounted(() => {
  startValue = 0;
  displayValue.value = 0;
  startTime = null;
  animationFrame = requestAnimationFrame(animate);
});

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});
</script>
