<!-- 消息通知，不需要显示，只需要监听事件，触发通知 -->
<template></template>

<script setup lang="ts">
import { useNotification } from "naive-ui";
import { usePlayer } from "../hooks/usePlayer";
const { playerData, refreshPlayerData } = usePlayer();

onMounted(() => {
  const notification = useNotification();
  // 右下角触发通知
  window.api.onWishGenerated((event: Event, petmateId: number) => {
    console.log("愿望生成", event, petmateId);
    const petmate = playerData.value?.petmates.find(
      (petmate) => petmate.id === petmateId
    );
    notification.info({
      title: "系统消息",
      content: `${petmate?.name}生成了一个心愿，快去看看吧`,
    });
    // 刷新玩家数据
    refreshPlayerData();
  });
});
</script>


<style lang="scss" scoped>
</style>