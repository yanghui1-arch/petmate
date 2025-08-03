<template>
  <div class="wish-item-card">
    <div class="wish-item-background"></div>
    <div class="wish-item-content">
      <div class="wish-item-icon">
        <span>✨</span>
      </div>
      <div class="wish-item-text">
        <span class="wish-name">{{ wishItemName }}</span>
      </div>
      <div class="wish-item-arrow">
        <span>→</span>
      </div>
    </div>
    <div class="wish-item-shimmer"></div>
  </div>
</template>

<script lang="ts" setup>
import { defineProps } from "vue";

// 暴露wishItemName属性
const props = defineProps<{
  wishItemName: string;
}>();
</script>

<style lang="scss" scoped>
.wish-item-card {
  width: 90%;
  position: relative;
  background: linear-gradient(
    135deg,
    $content-bgc 0%,
    rgba(85, 72, 75, 0.8) 100%
  );
  border-radius: 12px;
  margin: 6px 0;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(224, 166, 166, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  // 背景装饰层
  .wish-item-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(224, 166, 166, 0.05) 0%,
      rgba(253, 203, 110, 0.03) 50%,
      rgba(224, 166, 166, 0.05) 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  // 主要内容区域
  .wish-item-content {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    padding: 14px 16px;
    gap: 12px;

    .wish-item-icon {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(
        135deg,
        rgba(224, 166, 166, 0.2),
        rgba(253, 203, 110, 0.2)
      );
      border-radius: 8px;
      transition: all 0.3s ease;

      span {
        font-size: 14px;
        filter: grayscale(0.3);
        transition: all 0.3s ease;
      }
    }

    .wish-item-text {
      flex: 1;
      display: flex;
      align-items: center;

      .wish-name {
        color: $font-light;
        font-weight: 500;
        font-size: 14px;
        line-height: 1.4;
        transition: all 0.3s ease;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
    }

    .wish-item-arrow {
      flex-shrink: 0;
      opacity: 0.6;
      transition: all 0.3s ease;

      span {
        color: $font-muted-light;
        font-size: 14px;
        font-weight: bold;
      }
    }
  }

  // 悬停时的闪光效果
  .wish-item-shimmer {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 20%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0.1) 80%,
      transparent 100%
    );
    opacity: 0;
    transition: all 0.6s ease;
    z-index: 3;
    pointer-events: none;
  }

  // 悬停效果
  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-color: rgba(224, 166, 166, 0.4);

    .wish-item-background {
      opacity: 1;
    }

    .wish-item-content {
      .wish-item-icon {
        background: linear-gradient(
          135deg,
          rgba(224, 166, 166, 0.4),
          rgba(253, 203, 110, 0.4)
        );
        transform: scale(1.1);

        span {
          filter: grayscale(0);
          transform: scale(1.1);
        }
      }

      .wish-item-text .wish-name {
        color: $color-pink-100;
        transform: translateX(2px);
      }

      .wish-item-arrow {
        opacity: 1;
        transform: translateX(4px);

        span {
          color: $color-pink-100;
        }
      }
    }

    .wish-item-shimmer {
      opacity: 1;
      left: 100%;
    }
  }

  // 点击效果
  &:active {
    transform: translateY(-1px) scale(1.01);
    transition: all 0.1s ease;
  }

  // 入场动画
  animation: wishItemEntrance 0.5s ease-out forwards;
}

// 入场动画
@keyframes wishItemEntrance {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>