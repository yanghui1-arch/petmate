<template>
  <div class="commission-page">
    <div class="commission-page-layout">
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
  completedCommission.value = {
    ...commission,
    name:
      result.completionCount > 1
        ? `${commission.name} ×${result.completionCount}`
        : commission.name,
  };
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
  min-height: 0;
  height: 100%;
  padding: 50px 5% 24px;
  background: $system-bgc;
  overflow-y: auto;
}

.commission-page-layout {
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
