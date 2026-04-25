<template>
  <n-modal v-model:show="isModalShow">
    <div v-if="commission" class="commission-modal-wrapper">
      <div class="commission-modal-preview">
        <img :src="commission.imageUrl" :alt="commission.name" />
        <span class="commission-modal-status" :class="statusClass">
          {{ statusText }}
        </span>
      </div>

      <div class="commission-modal-info">
        <div class="commission-modal-kicker">节日委托</div>
        <div class="commission-modal-title">{{ commission.name }}</div>
        <div class="commission-modal-description">
          {{ commission.description }}
        </div>

        <div class="commission-deadline" :class="{ expired: commission.status === 'expired' }">
          <span>{{ deadlineText }}</span>
          <span>{{ remainingText }}</span>
        </div>

        <div class="commission-requirements">
          <div
            v-for="requirement in requirementRows"
            :key="requirement.itemId"
            class="commission-requirement-row"
            :class="{ missing: requirement.owned < requirement.totalCount }"
          >
            <n-image
              :src="requirement.imageUrl ?? ''"
              width="36"
              height="36"
              preview-disabled
              object-fit="contain"
            />
            <div class="commission-requirement-main">
              <span class="commission-requirement-name">{{ requirement.itemName }}</span>
              <span class="commission-requirement-tip">交付 {{ requirement.count }} × {{ completionCount }} 个</span>
            </div>
            <span class="commission-requirement-count">
              {{ requirement.owned }}/{{ requirement.totalCount }}
            </span>
          </div>
        </div>

        <div class="commission-batch-control">
          <span class="commission-batch-label">交付次数</span>
          <div class="commission-batch-stepper">
            <button
              type="button"
              :disabled="completionCount <= 1"
              @click="decreaseCompletionCount"
            >
              -
            </button>
            <input
              v-model.number="completionCount"
              type="number"
              min="1"
              :max="maxCompletionCount"
              @blur="normalizeCompletionCountInput"
            />
            <button
              type="button"
              :disabled="completionCount >= maxCompletionCount"
              @click="increaseCompletionCount"
            >
              +
            </button>
          </div>
          <button
            type="button"
            class="commission-batch-max"
            :disabled="maxCompletionCount <= 0"
            @click="completionCount = maxCompletionCount"
          >
            最大 {{ maxCompletionCount }}
          </button>
        </div>
      </div>

      <div class="commission-modal-actions">
        <button type="button" class="commission-cancel-btn" @click="closeModal">
          稍后
        </button>
        <button
          type="button"
          class="commission-submit-btn"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          {{ submitButtonText }}
        </button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Commission } from "@/types/commission";
import type { CommissionCompletionResult } from "@main/types/player-resource";
import { useCommission } from "@/hooks/useCommission";
import { usePlayer } from "@/hooks/usePlayer";
import { useShow } from "@/hooks/useShow";
import { openMessageModal } from "@/hooks/useInteract";

const props = defineProps<{
  show: boolean;
  commission: Commission | null;
  playerItemCounts: Record<number, number>;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "completed", commission: Commission, result: CommissionCompletionResult): void;
}>();

const { submitCommission } = useCommission();
const { refreshPlayerData } = usePlayer();
const { getImageURL } = useShow();

const isSubmitting = ref(false);
const completionCount = ref(1);

const isModalShow = computed({
  get: () => props.show,
  set: (val) => emit("update:show", val),
});

const requirementRows = computed(() => {
  return (props.commission?.requirements ?? []).map((requirement) => ({
    ...requirement,
    owned: props.playerItemCounts[requirement.itemId] ?? 0,
    totalCount: requirement.count * completionCount.value,
    imageUrl: getImageURL("item", requirement.itemUrl),
  }));
});

const maxCompletionCount = computed(() => {
  const requirements = props.commission?.requirements ?? [];
  if (requirements.length === 0) return 0;

  return Math.max(
    0,
    Math.min(
      ...requirements.map((requirement) =>
        Math.floor((props.playerItemCounts[requirement.itemId] ?? 0) / requirement.count)
      )
    )
  );
});

const hasEnoughRequirements = computed(() => {
  return (
    requirementRows.value.length > 0 &&
    requirementRows.value.every(
      (requirement) => requirement.owned >= requirement.totalCount
    ) &&
    completionCount.value > 0
  );
});

const canSubmit = computed(() => {
  return (
    props.commission?.status === "active" &&
    hasEnoughRequirements.value &&
    !isSubmitting.value
  );
});

const statusText = computed(() => {
  if (!props.commission) return "";
  if (props.commission.status === "expired") return "已截止";
  if (!hasEnoughRequirements.value) return "待交付";
  return `可交付 ${completionCount.value} 次`;
});

const statusClass = computed(() => {
  if (!props.commission) return "";
  if (props.commission.status === "expired") return "expired";
  if (!hasEnoughRequirements.value) return "missing";
  return "active";
});

const submitButtonText = computed(() => {
  if (isSubmitting.value) return "交付中...";
  if (!props.commission) return "交付";
  if (props.commission.status === "expired") return "已截止";
  if (!hasEnoughRequirements.value) return "交给尤美";
  return `交给尤美 ×${completionCount.value}`;
});

const deadlineText = computed(() => {
  if (!props.commission) return "";
  const deadline = props.commission.deadline;
  return `截止时间 ${deadline.getFullYear()}年${deadline.getMonth() + 1}月${deadline.getDate()}日 ${String(
    deadline.getHours()
  ).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")}`;
});

const remainingText = computed(() => {
  if (!props.commission) return "";
  const remaining = props.commission.deadline.getTime() - Date.now();
  if (remaining <= 0) return "已经截止";

  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;
  const days = Math.floor(remaining / dayMs);
  const hours = Math.floor((remaining % dayMs) / hourMs);
  const minutes = Math.floor((remaining % hourMs) / minuteMs);

  if (days > 0) return `还剩 ${days} 天 ${hours} 小时`;
  if (hours > 0) return `还剩 ${hours} 小时 ${minutes} 分钟`;
  return `还剩 ${Math.max(minutes, 1)} 分钟`;
});

watch(
  () => props.show,
  (show) => {
    if (!show) {
      isSubmitting.value = false;
      completionCount.value = 1;
      return;
    }

    normalizeCompletionCountInput();
  }
);

watch(maxCompletionCount, () => {
  normalizeCompletionCountInput();
});

const closeModal = () => {
  isModalShow.value = false;
};

const handleSubmit = async () => {
  if (!props.commission || isSubmitting.value) return;
  normalizeCompletionCountInput();

  if (!hasEnoughRequirements.value) {
    openMessageModal("fail", "请检查背包");
    return;
  }

  isSubmitting.value = true;
  const result = await submitCommission(props.commission, completionCount.value);
  isSubmitting.value = false;

  if (result.success) {
    await refreshPlayerData();
    closeModal();
    if (result.result) {
      emit("completed", props.commission, result.result);
    }
    return;
  }

  openMessageModal("fail", result.message);
};

const decreaseCompletionCount = () => {
  completionCount.value = Math.max(1, completionCount.value - 1);
};

const increaseCompletionCount = () => {
  if (maxCompletionCount.value <= 0) return;
  completionCount.value = Math.min(maxCompletionCount.value, completionCount.value + 1);
};

function normalizeCompletionCountInput() {
  if (maxCompletionCount.value <= 0) {
    completionCount.value = 1;
    return;
  }

  if (!Number.isInteger(completionCount.value) || completionCount.value <= 0) {
    completionCount.value = 1;
  }

  completionCount.value = Math.min(completionCount.value, maxCompletionCount.value);
}
</script>

<style scoped lang="scss">
.commission-modal-wrapper {
  width: 360px;
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: $content-bgc;
  border: 1px solid rgba(253, 203, 110, 0.32);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.34);
}

.commission-modal-preview {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
  background: #fff8e1;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 58px;
    background: linear-gradient(0deg, rgba(85, 72, 75, 1), rgba(85, 72, 75, 0));
  }
}

.commission-modal-status {
  position: absolute;
  right: 14px;
  bottom: 12px;
  z-index: 1;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #8b4513;
  background: rgba(255, 248, 225, 0.94);
  box-shadow: 0 4px 12px rgba(35, 30, 31, 0.22);

  &.completed {
    color: #1f6f4a;
    background: rgba(210, 255, 232, 0.94);
  }

  &.expired,
  &.missing {
    color: #684545;
    background: rgba(245, 245, 245, 0.93);
  }
}

.commission-modal-info {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
  padding: 16px 18px 12px;
}

.commission-modal-kicker {
  width: fit-content;
  padding: 2px 8px;
  color: #8b4513;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff8e1, #d7f8ff);
}

.commission-modal-title {
  color: #ffffff;
  font-size: 21px;
  font-weight: 800;
  line-height: 1.2;
}

.commission-modal-description {
  color: #f1c1c1;
  font-size: 13px;
  line-height: 1.65;
}

.commission-deadline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  color: #fff8e1;
  font-size: 12px;
  background: rgba(255, 248, 225, 0.08);
  border: 1px solid rgba(253, 203, 110, 0.2);

  &.expired {
    color: rgba(255, 255, 255, 0.62);
  }
}

.commission-requirements {
  display: flex;
  flex-direction: column;
  row-gap: 8px;
}

.commission-requirement-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &.missing {
    border-color: rgba(255, 118, 117, 0.36);
    background: rgba(255, 118, 117, 0.08);

    .commission-requirement-count {
      color: #ffb6bf;
      border-color: rgba(255, 118, 117, 0.38);
      background: rgba(255, 118, 117, 0.1);
    }
  }
}

.commission-requirement-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  row-gap: 2px;
}

.commission-requirement-name {
  color: $font-light;
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commission-requirement-tip {
  color: rgba(255, 255, 255, 0.62);
  font-size: 11px;
}

.commission-requirement-count {
  min-width: 54px;
  padding: 3px 8px;
  border-radius: 999px;
  color: #9ef1c4;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  border: 1px solid rgba(158, 241, 196, 0.32);
  background: rgba(158, 241, 196, 0.08);
}

.commission-batch-control {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 248, 225, 0.08);
  border: 1px solid rgba(253, 203, 110, 0.2);
}

.commission-batch-label {
  color: #fff8e1;
  font-size: 12px;
  font-weight: 700;
}

.commission-batch-stepper {
  display: grid;
  grid-template-columns: 28px minmax(44px, 1fr) 28px;
  align-items: center;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(253, 203, 110, 0.28);
  background: rgba(35, 30, 31, 0.28);

  button,
  input {
    height: 28px;
    border: none;
    color: #ffffff;
    background: transparent;
    text-align: center;
    font-weight: 800;
  }

  button {
    color: #ffe6a7;
    font-size: 16px;

    &:disabled {
      cursor: not-allowed;
      color: rgba(255, 255, 255, 0.32);
    }
  }

  input {
    min-width: 0;
    border-left: 1px solid rgba(253, 203, 110, 0.18);
    border-right: 1px solid rgba(253, 203, 110, 0.18);
    outline: none;
  }
}

.commission-batch-max {
  height: 28px;
  padding: 0 8px;
  border: 1px solid rgba(253, 203, 110, 0.28);
  border-radius: 8px;
  color: #8b4513;
  font-size: 12px;
  font-weight: 800;
  background: linear-gradient(135deg, #fff8e1, #ffd6e7);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.commission-modal-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
  padding: 4px 18px 18px;
}

.commission-cancel-btn,
.commission-submit-btn {
  width: 112px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(253, 203, 110, 0.3);
  font-size: 14px;
  font-weight: 700;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.commission-cancel-btn {
  color: #8b4513;
  background: linear-gradient(135deg, #f7f5f5, #fad2d2);
}

.commission-submit-btn {
  color: #ffffff;
  background: linear-gradient(135deg, #ff7675, #6bc8d9);

  &:disabled {
    cursor: not-allowed;
    filter: grayscale(0.55) brightness(0.78);
  }
}

.commission-cancel-btn:hover,
.commission-submit-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(255, 118, 117, 0.28);
}

.commission-cancel-btn:active,
.commission-submit-btn:not(:disabled):active {
  transform: translateY(0);
}
</style>
