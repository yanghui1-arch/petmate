<template>
  <div class="container">
    <!-- 主应用内容 -->
    <template v-if="playerData">

      <router-view />

      <div class="navigator-drawer" v-if="showNavigator" @click="activate('left')">
          <n-image :src="navigatorIcon" width="28" height="28" preview-disabled class="clickable"/>
      </div>

      <!-- 右上角关闭按钮 -->
      <div class="close-button-wrapper" v-if="showClosedButton">
        <div class="close-button">
          <span class="close-icon" @click="closeWin" style="-webkit-app-region: no-drag;">×</span>
        </div>
      </div>

      <Navigator v-model:active="active" :placement="placement" />
      <!-- 系统消息通知，在右下角弹出，最多同时显示2条 -->
      <n-notification-provider placement="bottom-right" :max="2">
        <MessageNotification />
      </n-notification-provider>
      <MessageModal
        :show="isMessageModalShow"
        :title="messageModalTitle"
        :type="messageModalType"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
// 你可以在这里写 Composition API 的逻辑
import Navigator from "./components/Navigator.vue";
import MessageModal from "./components/MessageModal.vue";
import MessageNotification from "./components/MessageNotification.vue";
import type { DrawerPlacement } from "naive-ui";
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { usePlayer } from "./hooks/usePlayer";
import {
  isMessageModalShow,
  messageModalType,
  messageModalTitle,
} from "./hooks/useInteract";
import { useSettings } from "./hooks/useSettings";
import navigatorIcon from "./assets/image/navigator.png";

// 根据路由的meta属性，决定是否显示关闭按钮，petmate页面不显示
const route = useRoute();
const showClosedButton = computed(() => !route.meta.hideClosedButton === true);
const showNavigator = computed(() => !route.meta.hideNavigator === true);

const active = ref(false);
const placement = ref<DrawerPlacement>("right");
const activate = (place: DrawerPlacement) => {
  active.value = true;
  placement.value = place;
};

// 全局玩家状态 - 在这里加载数据
const { playerData, initPlayerData } = usePlayer();
const { initSettings } = useSettings();

// 当应用挂载时加载玩家数据
onMounted(async () => {

  console.log("Petmate启动，正在加载玩家数据");
  await initPlayerData();
  console.log("玩家数据加载完成", playerData.value);

  console.log("正在初始化设置");
  await initSettings();
  console.log("设置初始化完成");
});

const closeWin = () => {
    console.log("关闭窗口")
    window.api.closeWindow();
}

</script>

<style lang="scss" scoped>
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 右上角关闭按钮 */
.close-button-wrapper {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1001;
  pointer-events: none;
}

.close-button {
  position: relative;
  width: 48px;
  height: 40px;
  background: linear-gradient(225deg, #f8818d, #fe7784);
  border-radius: 0 0 0 50px;
  pointer-events: all;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(173, 96, 103, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.2),
    inset 0 -2px 4px rgba(0, 0, 0, 0.2);

  &:hover {
    background: linear-gradient(225deg, #f8818d, #fe7784);
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(122, 63, 68, 0.6),
      inset 0 2px 4px rgba(255, 255, 255, 0.3),
      inset 0 -2px 4px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: scale(0.95);
  }
}

.close-icon {
  color: white;
  font-size: 22px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  margin-top: -8px;
  margin-right: -8px;
  user-select: none;
}

.navigator-drawer {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 1001;
  cursor: pointer;
  z-index: 1001;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.1);
  }
}
</style>
