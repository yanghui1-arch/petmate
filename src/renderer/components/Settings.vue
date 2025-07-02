<template>
  <n-drawer v-model:show="show" :width="200" :placement="placement">
    <div class="settings-layout">
      <div class="page-navigator">

        <router-link to="/" class="page-navigator-item" @click="show = false">主页</router-link>
        <router-link to="/package" class="page-navigator-item" @click="show = false">背包</router-link>
        <router-link to="/shop" class="page-navigator-item" @click="show = false">商店</router-link>
        <router-link to="/activity" class="page-navigator-item" @click="show = false">活动</router-link>
        <router-link to="/wish" class="page-navigator-item" @click="show = false">心愿</router-link>
        <router-link to="/card" class="page-navigator-item" @click="show = false">卡组</router-link>
        <router-link to="/log" class="page-navigator-item" @click="show = false">点滴</router-link>
        <router-link to="/settings" class="page-navigator-item" @click="show = false">设置</router-link>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { defineProps, computed } from "vue";
import type { DrawerPlacement } from "naive-ui";

const props = defineProps<{
  active: boolean;
  placement: DrawerPlacement;
}>();

const emit = defineEmits<{
  (e: "update:active", value: boolean): void;
}>();

// 创建可读写的代理，使 <n-drawer> 能双向绑定
const show = computed({
  get: () => props.active,
  set: (val: boolean) => emit("update:active", val),
});
</script>

<style lang="scss" scoped>
.settings-layout {
  width: 100%;
  height: 100%;
  background-color: $color-white-100;
  padding: 0 15px;
  overflow: hidden;
}

.page-navigator {
  background-color: $color-white;
  margin-top: 20px;
  text-align: center;
  border-radius: 10px;
  .page-navigator-item {
    display: block;
    padding: 15px 0;
  }
  .page-navigator-item:hover {
    background-color: $color-white-200;
    cursor: pointer;
  }
}
</style>