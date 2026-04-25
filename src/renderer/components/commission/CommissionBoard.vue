<template>
  <section class="commission-board">
    <div class="commission-board-header">
      <div class="commission-title-group">
        <span class="commission-kicker">五一劳动节</span>
        <span class="commission-title">节日委托</span>
      </div>
      <div class="commission-summary">
        <span>{{ completedCount }}/{{ holidayCommissions.length }}</span>
        <span>{{ deadlineText }}</span>
      </div>
    </div>

    <div class="commission-list">
      <button
        v-for="commission in holidayCommissions"
        :key="commission.id"
        type="button"
        class="commission-card"
        :class="[`commission-card-${commission.status}`]"
        :style="getCardStyle(commission.imageUrl)"
        :aria-label="commission.name"
        @click="openCommission(commission)"
      >
        <span class="commission-card-shine"></span>
        <span class="commission-status">{{ getStatusText(commission) }}</span>
        <span class="commission-card-name">{{ commission.name }}</span>
      </button>
    </div>

    <CommissionModal
      v-model:show="isCommissionModalShow"
      :commission="selectedCommission"
      :player-item-counts="playerItemCounts"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import CommissionModal from "./CommissionModal.vue";
import { useCommission } from "@/hooks/useCommission";
import { usePlayer } from "@/hooks/usePlayer";
import type { Commission } from "@/types/commission";

const { holidayCommissions } = useCommission();
const { playerData } = usePlayer();

const selectedCommission = ref<Commission | null>(null);
const isCommissionModalShow = ref(false);

const playerItemCounts = computed<Record<number, number>>(() => {
  const counts: Record<number, number> = {};
  playerData.value?.items.forEach((item) => {
    counts[item.id] = item.count;
  });
  return counts;
});

const completedCount = computed(() => {
  return holidayCommissions.value.filter(
    (commission) => commission.status === "completed"
  ).length;
});

const deadlineText = computed(() => {
  const deadline = holidayCommissions.value[0]?.deadline;
  return deadline ? `截止 ${formatDeadline(deadline)}` : "";
});

const openCommission = (commission: Commission) => {
  selectedCommission.value = commission;
  isCommissionModalShow.value = true;
};

const getCardStyle = (imageUrl: string) => ({
  backgroundImage: `url(${imageUrl})`,
});

const getStatusText = (commission: Commission) => {
  if (commission.status === "completed") return "已完成";
  if (commission.status === "expired") return "已截止";
  return "可交付";
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
  margin: 0 0 10px;
  padding: 10px;
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(255, 248, 225, 0.16), rgba(126, 186, 255, 0.1)),
    rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(253, 203, 110, 0.28);
  box-shadow: 0 8px 22px rgba(35, 30, 31, 0.24);
}

.commission-board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.commission-title-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.commission-kicker {
  flex: 0 0 auto;
  padding: 2px 8px;
  color: #8b4513;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff8e1, #ffd6e7);
}

.commission-title {
  color: $font-light;
  font-size: 15px;
  font-weight: 700;
}

.commission-summary {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: rgba(255, 255, 255, 0.72);
  font-size: 10px;
  line-height: 1.3;
}

.commission-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.commission-card {
  position: relative;
  height: clamp(88px, 17vh, 124px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  background-position: center;
  background-size: cover;
  box-shadow:
    inset 0 -42px 36px rgba(35, 30, 31, 0.48),
    0 8px 18px rgba(0, 0, 0, 0.22);
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease,
    filter 0.24s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow:
      inset 0 -42px 36px rgba(35, 30, 31, 0.42),
      0 12px 22px rgba(253, 203, 110, 0.28);

    .commission-card-shine {
      transform: translateX(115%) rotate(18deg);
    }
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }
}

.commission-card-completed {
  filter: saturate(0.86) brightness(0.88);

  .commission-status {
    color: #1f6f4a;
    background: rgba(210, 255, 232, 0.94);
  }
}

.commission-card-expired {
  filter: grayscale(0.72) brightness(0.72);

  .commission-status {
    color: #684545;
    background: rgba(245, 245, 245, 0.9);
  }
}

.commission-card-shine {
  position: absolute;
  top: -18px;
  left: -65%;
  width: 46%;
  height: 140%;
  background: rgba(255, 255, 255, 0.22);
  transform: rotate(18deg);
  transition: transform 0.55s ease;
  pointer-events: none;
}

.commission-status {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 7px;
  color: #8b4513;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  background: rgba(255, 248, 225, 0.94);
  box-shadow: 0 2px 8px rgba(35, 30, 31, 0.2);
}

.commission-card-name {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 7px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.48);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
