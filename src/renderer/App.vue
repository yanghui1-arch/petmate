<template>
  <div class="container">
    <div class="settings-drawer" @click="activate('left')">
      <n-image
        width="40"
        height="40"
        src="../assets/image/navigator.png"
        preview-disabled
      />
    </div>
    <router-view />
    <!-- <Home /> -->
    <Settings v-model:active="active" :placement="placement" />
  </div>
</template>

<script setup lang="ts">
// 你可以在这里写 Composition API 的逻辑
import Settings from "./components/Settings.vue";
import type { DrawerPlacement } from "naive-ui";
import { ref } from "vue";

const active = ref(false);
const placement = ref<DrawerPlacement>("right");
const activate = (place: DrawerPlacement) => {
  active.value = true;
  placement.value = place;
};

const back = () => {};
</script>

<style lang="scss" scoped>
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.settings-drawer {
  position: fixed;
  top: 20px;
  left: 10px;
  height: 20px;
  padding-left: 20px;
  cursor: pointer;
  z-index: 1000;
}
</style>

