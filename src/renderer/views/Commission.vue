<template>
  <div class="commission-page">
    <div class="commission-page-layout">
      <div class="commission-page-header">
        <div>
          <div class="commission-page-title">委托</div>
          <div class="commission-page-subtitle">
            五一限定任务，交付礼物后领取动画和称谓奖励
          </div>
        </div>
        <div class="commission-page-chip">Labor 2026</div>
      </div>

      <CommissionBoard @completed="handleCompleted" />
    </div>

    <CommissionRewardReveal
      v-model:show="isRewardRevealShow"
      :commission-name="completedCommission?.name ?? ''"
      :reward-previews="rewardPreviews"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { Commission, CommissionRewardPreview } from "@/types/commission";
import type { CommissionCompletionResult, CommissionGrantedReward } from "@main/types/player-resource";
import CommissionBoard from "@/components/commission/CommissionBoard.vue";
import CommissionRewardReveal from "@/components/commission/CommissionRewardReveal.vue";
import { useShow } from "@/hooks/useShow";
import laborKickPreviewImage from "@/assets/models/youmei/animations/angry_kick/labor-skin/10.png";

const { getImageURL } = useShow();
const completedCommission = ref<Commission | null>(null);
const rewardPreviews = ref<CommissionRewardPreview[]>([]);
const isRewardRevealShow = ref(false);

const handleCompleted = (
  commission: Commission,
  result: CommissionCompletionResult
) => {
  completedCommission.value = commission;
  rewardPreviews.value = result.rewards.map(mapGrantedReward);
  isRewardRevealShow.value = true;
};

const mapGrantedReward = (
  reward: CommissionGrantedReward
): CommissionRewardPreview => {
  if (reward.type === "cash") {
    return {
      id: reward.id,
      type: "cash",
      name: reward.name,
      amount: reward.amount,
      description: reward.description,
    };
  }
  if (reward.type === "item") {
    return {
      id: `${reward.id}-${reward.count}`,
      type: "item",
      name: `${reward.name} x${reward.count}`,
      count: reward.count,
      description: reward.description,
      imageUrl: getImageURL("item", reward.itemUrl) ?? undefined,
    };
  }
  if (reward.type === "animation") {
    return {
      id: reward.id,
      type: "animation",
      name: reward.name,
      description: reward.description,
      imageUrl: laborKickPreviewImage,
    };
  }
  return {
    id: reward.id,
    type: "title",
    name: reward.name,
    description: reward.description,
  };
};
</script>

<style scoped lang="scss">
.commission-page {
  flex: 1;
  min-height: 100%;
  padding: 18px 5%;
  background: $system-bgc;
  overflow-y: auto;
}

.commission-page-layout {
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  row-gap: 16px;
}

.commission-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(255, 248, 225, 0.14), rgba(107, 200, 217, 0.1)),
    $content-bgc;
  border: 1px solid rgba(253, 203, 110, 0.24);
  box-shadow: 0 8px 24px rgba(35, 30, 31, 0.28);
}

.commission-page-title {
  color: #ffffff;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 0;
}

.commission-page-subtitle {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 13px;
}

.commission-page-chip {
  flex: 0 0 auto;
  padding: 6px 12px;
  border-radius: 999px;
  color: #8b4513;
  font-size: 12px;
  font-weight: 800;
  background: linear-gradient(135deg, #fff8e1, #ffd6e7);
}
</style>
