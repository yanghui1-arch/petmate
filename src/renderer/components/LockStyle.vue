<template>
  <div>
    <div class="locked-overlay" :style="{ borderRadius: borderRadius }">
        <div class="lock-icon">🔒</div>
        <div class="locked-requirements">
        <!-- <div class="locked-title">解锁条件:</div>
        <div class="locked-requirements-list">
            <div
            v-for="requirement in missingRequirements"
            :key="requirement"
            class="locked-requirement-item"
            >
            {{ requirement }}
            </div>
        </div> -->
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, PropType, computed } from "vue";
import { Requirement } from "../types/common";
import { PetMateAttribute } from "../types/petmate";
import { getMissingRequirements } from "../utils/check";
const props = defineProps({
  requirement: { type: Object as PropType<Requirement>, required: true }, // 解锁条件
  petmateAttribute: { type: Object as PropType<PetMateAttribute>, required: true }, // petmate属性
  borderRadius: { type: String, required: true }, // 样式的边框圆角，最好与调用组件的父组件的边框圆角一致
});
const missingRequirements = computed(() => {
  return getMissingRequirements(props.requirement, props.petmateAttribute);
});
</script>

<style lang="scss" scoped>
.locked {
  opacity: 0.5;
  filter: grayscale(70%) brightness(0.7);
  position: relative;
}

.locked-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  z-index: 10;

  .lock-icon {
    font-size: 24px;
    margin-bottom: 8px;
    opacity: 0.9;
    animation: lockPulse 2s ease-in-out infinite;
  }

  .locked-requirements {
    text-align: center;
    color: rgba(255, 255, 255, 0.9);
    font-size: 10px;

    .locked-title {
      font-weight: bold;
      margin-bottom: 4px;
      color: #ff6b6b;
      font-size: 11px;
    }
    .locked-requirements-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 4px;
      .locked-requirement-item {
        margin: 1px 0;
        padding: 1px 4px;
        background: rgba(255, 107, 107, 0.2);
        border-radius: 4px;
        border: 1px solid rgba(255, 107, 107, 0.3);
        font-size: 9px;
      }
    }
  }
}

// 锁图标的动画，无限闪烁
@keyframes lockPulse {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

// 底下的文本隐藏
.locked {
  .activity-item-header,
  .activity-item-content,
  .activity-item-reward {
    pointer-events: none;
  }

  .activity-item-name {
    color: rgba(255, 255, 255, 0.4) !important;
  }

  .activity-item-icon {
    filter: grayscale(100%);
    opacity: 0.5;
  }

  .activity-item-time-wrapper,
  .activity-item-requirement-wrapper,
  .activity-item-reward {
    color: rgba(255, 255, 255, 0.3) !important;
  }
}
</style>