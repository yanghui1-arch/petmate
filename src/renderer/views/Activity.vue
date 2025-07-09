<template>
  <div class="activity-container">
    <div class="activity-grade-layout">
      <div class="activity-grade-wrapper">
        <div class="activity-grade-item">
          <span class="activity-grade-label">唱歌</span>
          <span class="activity-grade-value">LV.1</span>
          <AttributeBar :value="65" :max="100" width="200px" color="#FF7EB6" />
        </div>
        <div class="activity-grade-item">
          <span class="activity-grade-label">绘画</span>
          <span class="activity-grade-value">LV.1</span>
          <AttributeBar :value="80" :max="100" width="200px" color="#7EBAFF" />
        </div>
        <div class="activity-grade-item">
          <span class="activity-grade-label">游戏</span>
          <span class="activity-grade-value">LV.1</span>
          <AttributeBar :value="45" :max="100" width="200px" color="#7EFF9E" />
        </div>
      </div>
    </div>
    <div class="activity-layout">
      <div class="activity-wrapper">
        <n-grid x-gap="12" y-gap="30" :cols="2">
          <n-gi v-for="activity in activities" :key="activity.id">
            <div class="activity-item-wrapper">
              <div class="activity-content">
                <span class="activity-title">{{ activity.name }}</span>
                <div class="activity-description">
                  {{ activity.description }}
                </div>
              </div>
            </div>
          </n-gi>
        </n-grid>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { Component } from "vue";
import AttributeBar from "../components/AttributeBar.vue";

const activities = [
  {
    id: 1,
    type: "study",
    name: "学习",
    description:
      "Read interesting books with your pet to improve their knowledge and intelligence.",
  },
  {
    id: 2,
    type: "entertainment",
    name: "工作",
    description:
      "Create beautiful artwork together to boost creativity and emotional bond.",
  },
  {
    id: 3,
    type: "entertainment",
    name: "娱乐",
    description:
      "Play interactive games to enhance reflexes and have fun together.",
  },
  {
    id: 4,
    type: "work",
    name: "Coding Practice",
    description:
      "Learn programming together and earn rewards through completing challenges.",
  },
];
</script>

<style scoped lang="scss">
.activity-container {
  flex: 1;
  padding: 0 3%;
  background: $system-bgc;
  display: flex;
  flex-direction: column;
  gap: 0;
  .activity-grade-layout {
    height: 20vh;
    margin-top: 20px;
  }
  .activity-layout {
    flex: 1;
  }
}

.activity-grade-wrapper {
  width: 100%;
  height: 100%;
  background: $content-bgc;
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 5px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;

  .activity-grade-item {
    display: flex;
    align-items: center;
    justify-content: space-around;
    .activity-grade-label {
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
    }
    .activity-grade-value {
      color: $color-pink-100;
      font-weight: bold;
    }
  }
}

.activity-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  .activity-item-wrapper {
    height: 30vh;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }
  }

  .activity-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 5px;
    .activity-title {
      font-size: 1.2rem;
      font-weight: bold;
      color: #fff;
    }
    .activity-icon {
      color: #fff;
    }

    .activity-description {
      flex: 1;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.5;
    }
  }
}
</style>