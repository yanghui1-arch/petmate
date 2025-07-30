<!-- 消息通知，不需要显示，只需要监听事件，触发通知 -->
<template></template>

<script setup lang="ts">
import { useNotification } from "naive-ui";
import { usePlayer } from "../hooks/usePlayer";
const { playerData, refreshPlayerData } = usePlayer();

const notificationDuration = 3000; // 通知持续时间，ms

onMounted(() => {
  const notification = useNotification();
  // 心愿生成监听回调
  window.api.onWishGenerated((event: Event, petmateId: number) => {
    console.log("愿望生成", event, petmateId);
    const petmate = playerData.value?.petmates.find(
      (petmate) => petmate.id === petmateId
    );
    notification.info({
      title: "系统消息",
      content: `${petmate?.name}生成了一个心愿，快去看看吧`,
      duration: notificationDuration,
    });
    // 刷新玩家数据
    refreshPlayerData();
  });
  // 活动结束监听回调
  window.api.onEndActivity((event: Event, petmateId: number) => {
    console.log("活动结束", event, petmateId);
    const petmate = playerData.value?.petmates.find(
      (petmate) => petmate.id === petmateId
    );
    notification.info({
      title: "系统消息",
      content: `${petmate?.name}进行的活动结束了，快去看看吧`,
      duration: notificationDuration,
    });
    // 刷新玩家数据
    refreshPlayerData();
  });
});
</script>


<style lang="scss" scoped>
</style>