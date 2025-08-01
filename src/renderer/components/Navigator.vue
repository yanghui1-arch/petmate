<template>
  <n-drawer v-model:show="show" :width="240" :placement="placement">
    <div class="settings-layout">
      <div class="settings-header">
        <div class="settings-title">
          <span class="title-icon">⚙️</span>
          <span class="title-text">导航菜单</span>
        </div>
        <div class="settings-subtitle">探索你的世界</div>
      </div>

      <div class="page-navigator">
        <div class="navigator-section">
          <div class="section-title">主要功能</div>
          <router-link
            to="/home"
            class="page-navigator-item"
            @click="show = false"
          >
            <span class="nav-icon">🏠</span>
            <span class="nav-text">主页</span>
            <span class="nav-arrow">→</span>
          </router-link>

          <router-link
            to="/shop"
            class="page-navigator-item"
            @click="show = false"
          >
            <span class="nav-icon">🛒</span>
            <span class="nav-text">商店</span>
            <span class="nav-arrow">→</span>
          </router-link>

          <router-link
            to="/activity"
            class="page-navigator-item"
            @click="show = false"
          >
            <span class="nav-icon">🎮</span>
            <span class="nav-text">活动</span>
            <span class="nav-arrow">→</span>
          </router-link>

          <router-link
            to="/wish"
            class="page-navigator-item"
            @click="show = false"
          >
            <span class="nav-icon">⭐</span>
            <span class="nav-text">心愿</span>
            <span class="nav-arrow">→</span>
          </router-link>
        </div>

        <div class="navigator-section">
          <div class="section-title">管理</div>
          <!-- <router-link
            to="/card"
            class="page-navigator-item"
            @click="show = false"
          >
            <span class="nav-icon">🃏</span>
            <span class="nav-text">卡组</span>
            <span class="nav-arrow">→</span>
          </router-link> -->

          <router-link
            to="/chat"
            class="page-navigator-item"
            @click="show = false"
          >
            <span class="nav-icon">💬</span>
            <span class="nav-text">聊天</span>
            <span class="nav-arrow">→</span>
          </router-link>
        </div>

        <div class="navigator-section">
          <div class="section-title">系统</div>
          <router-link
            to="/config"
            class="page-navigator-item"
            @click="show = false"
          >
            <span class="nav-icon">⚙️</span>
            <span class="nav-text">配置</span>
            <span class="nav-arrow">→</span>
          </router-link>

          <router-link
            to="/settings"
            class="page-navigator-item"
            @click="show = false"
          >
            <span class="nav-icon">🔧</span>
            <span class="nav-text">设置</span>
            <span class="nav-arrow">→</span>
          </router-link>
        </div>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { defineProps, computed } from "vue";
import type { DrawerPlacement } from "naive-ui";

const props = defineProps<{
  active: boolean;
  placement: DrawerPlacement;
}>();

const emit = defineEmits<{
  (e: "update:active", value: boolean): void;
}>();

// 创建可读写的代理，使 <n-drawer> 能双向绑定
const show = computed({
  get: () => props.active,
  set: (val: boolean) => emit("update:active", val),
});
</script>

<style lang="scss" scoped>
.settings-layout {
  width: 100%;
  height: 100%;
  background: $system-bgc;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-header {
  padding: 20px 20px 15px 20px;
  background: linear-gradient(
    135deg,
    rgba($color-pink-100, 0.1),
    rgba($color-pink-100, 0.05)
  );
  border-bottom: 1px solid rgba($color-pink-100, 0.2);

  .settings-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;

    .title-icon {
      font-size: 20px;
      filter: drop-shadow(0 2px 4px rgba($color-pink-100, 0.3));
    }

    .title-text {
      font-size: 18px;
      font-weight: 600;
      color: $font-light;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }
  }

  .settings-subtitle {
    font-size: 12px;
    color: rgba($font-light, 0.7);
    margin-left: 30px;
    font-style: italic;
  }
}

.page-navigator {
  flex: 1;
  padding: 15px 20px;
  overflow-y: auto;

  .navigator-section {
    margin-bottom: 25px;

    &:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 12px;
      color: rgba($font-light, 0.6);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      padding-left: 5px;
      border-left: 2px solid $color-pink-100;
      padding-left: 10px;
    }
  }

  .page-navigator-item {
    display: flex;
    align-items: center;
    padding: 12px 15px;
    margin-bottom: 8px;
    background: $content-bgc;
    border-radius: 10px;
    border: 1px solid transparent;
    color: $font-light;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba($color-pink-100, 0.1),
        transparent
      );
      transition: left 0.5s ease;
    }

    .nav-icon {
      font-size: 16px;
      margin-right: 12px;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
      transition: transform 0.3s ease;
    }

    .nav-text {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .nav-arrow {
      font-size: 14px;
      opacity: 0;
      transform: translateX(-10px);
      transition: all 0.3s ease;
      color: $color-pink-100;
    }

    &:hover {
      transform: translateX(5px);
      background: linear-gradient(
        135deg,
        $content-bgc,
        rgba($color-pink-100, 0.1)
      );
      border-color: rgba($color-pink-100, 0.3);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4),
        0 0 20px rgba($color-pink-100, 0.2);

      &::before {
        left: 100%;
      }

      .nav-icon {
        transform: scale(1.1);
      }

      .nav-arrow {
        opacity: 1;
        transform: translateX(0);
      }
    }

    &:active {
      transform: translateX(3px) scale(0.98);
    }

    &.router-link-active {
      background: linear-gradient(
        135deg,
        rgba($color-pink-100, 0.2),
        rgba($color-pink-100, 0.1)
      );
      border-color: $color-pink-100;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4),
        0 0 20px rgba($color-pink-100, 0.3);

      .nav-text {
        color: $color-pink-100;
        font-weight: 600;
      }

      .nav-arrow {
        opacity: 1;
        transform: translateX(0);
      }
    }
  }
}

// 自定义滚动条样式
.page-navigator::-webkit-scrollbar {
  width: 4px;
}

.page-navigator::-webkit-scrollbar-track {
  background: rgba($content-bgc, 0.3);
  border-radius: 2px;
}

.page-navigator::-webkit-scrollbar-thumb {
  background: rgba($color-pink-100, 0.5);
  border-radius: 2px;

  &:hover {
    background: rgba($color-pink-100, 0.7);
  }
}
</style>