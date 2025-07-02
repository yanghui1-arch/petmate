<template>

  <div class="container">
    <div class="settings-drawer" @click="activate('left')">
      三
    </div>
    <router-view />
    <Settings v-model:active="active" :placement="placement" />
  </div>

</template>

<script setup lang="ts">
// 你可以在这里写 Composition API 的逻辑
import Wish from "./views/Wish.vue";
import Home from "./views/Home.vue";
import Settings from "./components/Settings.vue";
import type { DrawerPlacement } from "naive-ui";
import { defineComponent, ref } from "vue";

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
}
.settings-drawer {
  height: 20px;
  padding-left: 20px;
  cursor: pointer;
}
</style>

