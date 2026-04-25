<template>
  <section class="commission-board">
    <div class="commission-board-header">
      <div class="commission-title-group">
        <span class="commission-kicker">五一劳动节</span>
        <span class="commission-title">节日委托</span>
      </div>
      <div class="commission-summary">
        <span>已交付 {{ totalCompletionCount }} 次</span>
        <span>{{ deadlineText }}</span>
      </div>
    </div>

    <div class="commission-list">
      <button
        v-for="commission in holidayCommissions"
        :key="commission.id"
        type="button"
        class="commission-row"
        :class="[`commission-row-${commission.status}`]"
        @click="openCommission(commission)"
      >
        <span
          class="commission-row-bg"
          :style="getRowBackgroundStyle(commission.imageUrl)"
        ></span>
        <span class="commission-row-overlay"></span>
        <span class="commission-status">{{ getStatusText(commission) }}</span>

        <div class="commission-main">
          <div class="commission-row-head">
            <div>
              <div class="commission-name">{{ commission.name }}</div>
              <div class="commission-description">{{ commission.description }}</div>
            </div>
            <span class="commission-deadline">{{ formatDeadline(commission.deadline) }}</span>
          </div>

          <div class="commission-row-detail">
            <div class="commission-detail-group">
              <span class="detail-label">交付</span>
              <span
                v-for="requirement in commission.requirements"
                :key="requirement.itemId"
                class="detail-pill"
                :class="{ missing: getOwnedCount(requirement.itemId) < requirement.count }"
              >
                {{ requirement.itemName }} {{ getOwnedCount(requirement.itemId) }}/{{ requirement.count }}
              </span>
            </div>

            <div class="commission-detail-group">
              <span class="detail-label">奖励</span>
              <span
                v-for="reward in commission.rewards"
                :key="reward.id"
                class="detail-pill reward"
              >
                {{ reward.name }}
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>

    <CommissionModal
      v-model:show="isCommissionModalShow"
      :commission="selectedCommission"
      :player-item-counts="playerItemCounts"
      @completed="handleCompleted"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Commission } from "@/types/commission";
import type { CommissionCompletionResult } from "@main/types/player-resource";
import CommissionModal from "./CommissionModal.vue";
import { useCommission } from "@/hooks/useCommission";
import { usePlayer } from "@/hooks/usePlayer";

const { holidayCommissions, playerResources, refreshPlayerResources } = useCommission();
const { playerData } = usePlayer();

const emit = defineEmits<{
  (e: "completed", commission: Commission, result: CommissionCompletionResult): void;
}>();

const selectedCommission = ref<Commission | null>(null);
const isCommissionModalShow = ref(false);

onMounted(async () => {
  await refreshPlayerResources();
});

const playerItemCounts = computed<Record<number, number>>(() => {
  const counts: Record<number, number> = {};
  playerData.value?.items.forEach((item) => {
    counts[item.id] = item.count;
  });
  return counts;
});

const totalCompletionCount = computed(() => {
  return Object.values(playerResources.value.commissionCompletionCounts).reduce(
    (total, count) => total + count,
    0
  );
});

const deadlineText = computed(() => {
  const deadline = holidayCommissions.value[0]?.deadline;
  return deadline ? `截止 ${formatDeadline(deadline)}` : "";
});

const openCommission = (commission: Commission) => {
  selectedCommission.value = commission;
  isCommissionModalShow.value = true;
};

const handleCompleted = (
  commission: Commission,
  result: CommissionCompletionResult
) => {
  emit("completed", commission, result);
};

const getRowBackgroundStyle = (imageUrl: string) => ({
  backgroundImage: `url(${imageUrl})`,
});

const getOwnedCount = (itemId: number) => playerItemCounts.value[itemId] ?? 0;

const getStatusText = (commission: Commission) => {
  if (commission.status === "expired") return "已截止";
  const count = playerResources.value.commissionCompletionCounts[commission.id] ?? 0;
  return count > 0 ? `已交付 ${count}` : "可交付";
};

const formatDeadline = (date: Date) => {
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
</script>

<style scoped lang="scss">
.commission-board {
  width: 100%;
  display: flex;
  flex-direction: column;
  row-gap: 12px;
}

.commission-board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.commission-title-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.commission-kicker {
  flex: 0 0 auto;
  padding: 3px 10px;
  color: #8b4513;
  font-size: 11px;
  font-weight: 800;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff8e1, #ffd6e7);
}

.commission-title {
  color: $font-light;
  font-size: 20px;
  font-weight: 800;
}

.commission-summary {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  line-height: 1.4;
}

.commission-list {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
}

.commission-row {
  width: 100%;
  min-height: 146px;
  display: flex;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(253, 203, 110, 0.24);
  background: $content-bgc;
  box-shadow: 0 8px 22px rgba(35, 30, 31, 0.26);
  text-align: left;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: rgba(253, 203, 110, 0.42);
    box-shadow: 0 12px 28px rgba(253, 203, 110, 0.18);

    .commission-row-bg {
      transform: scale(1.05);
    }
  }

  &:active {
    transform: translateY(0);
  }
}

.commission-row-bg,
.commission-row-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.commission-row-bg {
  z-index: -2;
  background-position: center;
  background-size: cover;
  transform: scale(1.01);
  transition:
    transform 0.32s ease,
    filter 0.24s ease;
}

.commission-row-overlay {
  z-index: -1;
  background:
    linear-gradient(90deg, rgba(35, 30, 31, 0.9) 0%, rgba(35, 30, 31, 0.76) 52%, rgba(35, 30, 31, 0.38) 100%),
    linear-gradient(0deg, rgba(35, 30, 31, 0.72), rgba(35, 30, 31, 0.14));
  box-shadow: inset 0 -48px 44px rgba(35, 30, 31, 0.36);
}

.commission-row-expired {
  .commission-row-bg {
    filter: grayscale(0.62) brightness(0.62);
  }

  .commission-status {
    color: #684545;
    background: rgba(245, 245, 245, 0.92);
  }
}

.commission-status {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  padding: 3px 10px;
  color: #8b4513;
  font-size: 11px;
  font-weight: 800;
  border-radius: 999px;
  background: rgba(255, 248, 225, 0.94);
  box-shadow: 0 2px 8px rgba(35, 30, 31, 0.2);
}

.commission-main {
  min-width: 0;
  width: min(100%, 430px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  row-gap: 10px;
  position: relative;
  z-index: 1;
}

.commission-row-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.commission-name {
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
}

.commission-description {
  margin-top: 4px;
  color: #f0c3c3;
  font-size: 12px;
  line-height: 1.45;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.commission-deadline {
  flex: 0 0 auto;
  color: rgba(255, 248, 225, 0.78);
  font-size: 11px;
  white-space: nowrap;
}

.commission-row-detail {
  display: flex;
  flex-direction: column;
  row-gap: 6px;
}

.commission-detail-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.detail-label {
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  font-weight: 700;
}

.detail-pill {
  padding: 2px 7px;
  border-radius: 999px;
  color: #9ef1c4;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(158, 241, 196, 0.32);
  background: rgba(158, 241, 196, 0.08);

  &.missing {
    color: #ffb6bf;
    border-color: rgba(255, 118, 117, 0.38);
    background: rgba(255, 118, 117, 0.1);
  }

  &.reward {
    color: #ffe6a7;
    border-color: rgba(255, 230, 167, 0.3);
    background: rgba(255, 230, 167, 0.08);
  }
}
</style>
