<template>
  <div class="container">
    <!-- 玩家数据加载中 -->
    <div v-if="isLoading" class="loading-overlay">
      <n-spin size="large" />
      <p>Loading player data...</p>
    </div>
    
    <!-- 玩家数据加载失败 -->
    <div v-else-if="error" class="error-overlay">
      <p>Failed to load player data: {{ error }}</p>
      <n-button @click="loadPlayerData">Retry</n-button>
    </div>
    
    <!-- 主应用内容 -->
    <template v-else-if="playerData">
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
    </template>
  </div>
</template>

<script setup lang="ts">
// 你可以在这里写 Composition API 的逻辑
import Settings from "./components/Settings.vue";
import type { DrawerPlacement } from "naive-ui";
import { ref, onMounted } from "vue";
import { usePlayer } from "./hooks/usePlayer";
import { useSettings } from "./hooks/useSettings";

const active = ref(false);
const placement = ref<DrawerPlacement>("right");
const activate = (place: DrawerPlacement) => {
  active.value = true;
  placement.value = place;
};

const back = () => {};

// 全局玩家状态 - 在这里加载数据
const { playerData, isLoading, error, loadPlayerData } = usePlayer();
const { initSettings } = useSettings();

// 当应用挂载时加载玩家数据
onMounted(async () => {
  console.log("Petmate启动，正在加载玩家数据");
  await loadPlayerData();
  console.log("玩家数据加载完成", playerData.value);

  console.log("正在初始化设置");
  await initSettings();
  console.log("设置初始化完成", );
});
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
  // top: 20px;
  // left: 10px;
  top: 0;
  left: 0;
  cursor: pointer;
  z-index: 1000;
}

.loading-overlay,
.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  z-index: 9999;
}

.loading-overlay p,
.error-overlay p {
  margin-top: 16px;
  font-size: 16px;
}
</style>

