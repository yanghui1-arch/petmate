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
  // 活动可领取监听回调
  window.api.onActivityFinished((event: Event, petmateId: number) => {
    console.log("活动奖励可领取", event, petmateId);
    const petmate = playerData.value?.petmates.find(
      (petmate) => petmate.id === petmateId
    );
    notification.success({
      title: "活动完成",
      content: `${petmate?.name}的活动已完成，快去领取奖励吧！`,
      duration: notificationDuration,
    });
    // 刷新玩家数据
    refreshPlayerData();
  });
  // 心愿完成监听回调
  window.api.onWishFinished(
    (_: Event, petmateId: number, finishedWishNames: string[]) => {
      const petmate = playerData.value?.petmates.find(
        (petmate) => petmate.id === petmateId
      );
      // 如果完成了多个心愿，则产生多个通知
      finishedWishNames.forEach((wishName) => {
        notification.info({
          title: "系统消息",
          content: `${petmate?.name}完成了心愿：${wishName}，快去看看吧`,
          duration: notificationDuration,
        });
      });
    }
  );
});
</script>


<style lang="scss" scoped>
</style>