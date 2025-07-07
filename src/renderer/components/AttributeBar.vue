<template>
  <div class="attribute-bar" :style="{ width: width, height: height }">
    <div
      class="attribute-bar-filled"
      :style="{
        width: filledWidth,
        backgroundColor: barColor,
      }"
    />
    <div class="attribute-bar-label">{{ value }} / {{ max }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps } from "vue";

const props = defineProps({
  value: { type: Number, required: true },
  max: { type: Number, default: 100 },
  color: { type: String },
  width: { type: String, default: "60%" },
  height: { type: String, default: "18px" },
});

const percent = computed(() => {
  return Math.min(100, Math.max(0, (props.value / props.max) * 100));
});

const filledWidth = computed(() => {
  return `${percent.value}%`;
});

const barColor = computed(() => {
  // 色相 H 从 0（红）到 120（绿）
  const hue = (percent.value * 120) / 100;
  return props.color == null ? `hsl(${hue}, 70%, 50%)` : props.color;
});
</script>


<style lang="scss" scoped>
.attribute-bar {
  position: relative;
  background-color: #ccc;
  border-radius: 4px;
  overflow: hidden;
}

.attribute-bar-filled {
  position: relative;
  height: 100%;
  transition: width 0.3s ease;
  overflow: hidden;

  /* glossy moving highlight */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -50%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.4) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: skewX(-20deg);
    animation: glossMove 2s infinite;
    pointer-events: none;
  }
}

.attribute-bar-label {
  position: absolute;
  width: 100%;
  text-align: center;
  top: 0;
  left: 0;
  font-size: 12px;
  color: #fff;
  line-height: inherit;
  pointer-events: none;
}

@keyframes glossMove {
  0% {
    left: -50%;
  }
  100% {
    left: 100%;
  }
}
</style>