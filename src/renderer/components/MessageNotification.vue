<!-- 消息通知，不需要显示，只需要监听事件，触发通知 -->
<template>
</template>

<script setup lang="ts">
import { useNotification } from "naive-ui";
import { useI18n } from "vue-i18n";
import { usePlayer } from "../hooks/usePlayer";
import { useRoute } from "vue-router";
import { getPetmateName, getWishNameFromSource } from "../utils/content";
const { playerData, refreshPlayerData } = usePlayer();
const { t } = useI18n();

const notificationDuration = 3000; // 通知持续时间，ms

const route = useRoute();
// 在petmate页面只接收通知，在其他页面刷新数据
const recieveNotification = computed(() => route.meta.recieveNotification ?? false);
onMounted(() => {
  const notification = useNotification();
  // 心愿生成监听回调
  window.api.onWishGenerated((event: Event, petmateId: number) => {
    console.log("愿望生成", event, petmateId);
    if (!recieveNotification.value) {
      // 刷新玩家数据
      refreshPlayerData();
      return;
    }
    const petmate = playerData.value?.petmates.find(
      (petmate) => petmate.id === petmateId
    );
    notification.info({
      title: t("notifications.system"),
      content: t("notifications.wishGenerated", { petmate: getPetmateName(petmate?.name) }),
      duration: notificationDuration,
    });
  });
  // 活动可领取监听回调
  window.api.onActivityFinished((event: Event, petmateId: number) => {
    console.log("活动奖励可领取", event, petmateId);
    if (!recieveNotification.value) {
      // 刷新玩家数据
      refreshPlayerData();
      return;
    }
    const petmate = playerData.value?.petmates.find(
      (petmate) => petmate.id === petmateId
    );
    notification.success({
      title: t("notifications.activityCompletedTitle"),
      content: t("notifications.activityCompleted", { petmate: getPetmateName(petmate?.name) }),
      duration: notificationDuration,
    });
  });
  // 心愿完成监听回调
  window.api.onWishFinished(
    (_: Event, petmateId: number, finishedWishNames: string[]) => {
      if (!recieveNotification.value) {
        // 刷新玩家数据
        refreshPlayerData();
        return;
      }
      const petmate = playerData.value?.petmates.find(
        (petmate) => petmate.id === petmateId
      );
      // 如果完成了多个心愿，则产生多个通知
      finishedWishNames.forEach((wishName) => {
        notification.success({
          title: t("notifications.system"),
          content: t("notifications.wishCompleted", { petmate: getPetmateName(petmate?.name), wish: getWishNameFromSource(wishName) }),
          duration: notificationDuration,
        });
      });
    }
  );
});
</script>


<style lang="scss" scoped>
</style>
