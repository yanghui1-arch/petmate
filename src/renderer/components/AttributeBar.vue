<template>
  <div class="attribute-bar" :style="{ width: width, height: height }">
    <div class="attribute-bar-filled" :style="{
        width: filledWidth,
        backgroundColor: color
      }" />
    <div class="attribute-bar-label">
      {{ value }} / {{ max }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps } from "vue";

const props = defineProps({
  value: { type: Number, required: true },
  max: { type: Number, default: 100 },
  color: { type: String, default: "#42b983" },
  width: { type: String, default: "60%" },
  height: { type: String, default: "18px" },
});

const filledWidth = computed(() => {
  const percent = Math.min(100, Math.max(0, (props.value / props.max) * 100));
  return `${percent}%`;
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
  height: 100%;
  transition: width 0.3s ease;
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
</style>