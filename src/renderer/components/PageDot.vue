<template>
  <div class="pagedot-wrapper">
    <span
      class="pagedot-item"
      v-for="i in pageNum"
      :key="i"
      :class="{ 'active-dot': i === currentPage }"
      :style="{ backgroundColor: i === currentPage ? activeColor : '#ccc' }"
    ></span>
  </div>
</template>

<script setup>
import { computed, defineProps } from "vue";

const props = defineProps({
  pageNum: { type: Number, required: true },
  currentPage: { type: Number, required: true },
  activeColor: { type: String, required: true },
});
</script>

<style scoped>
.pagedot-wrapper {
  /* 定高，防止页面抖动 */
  height: 20px;
  display: flex;
  align-items: center;
  column-gap: 5px;
}
.pagedot-item {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background-color: #ccc;
  border: 1px solid #fff;
}
.active-dot {
  width: 13px;
  height: 13px;
  transition: all 0.3s;
}
</style>
