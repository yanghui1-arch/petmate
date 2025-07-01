<template>
  <div class="home-container">
    <div class="home-layout">
      <div class="home-panel-layout">
        <div class="home-title-wrapper">
          <div class="home-title">
            角色状态
          </div>
        </div>
        <div class="home-panel-wrapper">
          <div class="home-panel-content">
            <div class="home-panel-info">
              <div class="home-panel-image">
                <n-image width="70" src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg" />
              </div>
              <div class="home-panel-grade">
                <span class="grade-value">LEVEL 1</span>
              </div>
            </div>
            <div class="home-panel-stat">
              <div class="home-panel-view">
                <span>Dass</span>
                <span style="width: 60%; text-align: center;">(已喂养2天)</span>
              </div>

              <div class="attribute-item">
                <span>饱食度</span>
                <!-- <AttributeBar :value="hp" color="#ff9812" /> -->
                <AttributeBar :value="hp" color="#ff9812" />
              </div>
              <div class="attribute-item">
                <span>精力</span>
                <AttributeBar :value="hp" color="#ff9812" />
              </div>
              <div class="attribute-item">
                <span>心情</span>
                <AttributeBar :value="hp" color="#ff9812" />
              </div>
              <div class="attribute-item">
                <span>健康</span>
                <AttributeBar :value="hp" color="#ff9812" />
              </div>
            </div>
          </div>
          <div class="home-grade-detail">
            <AttributeBar :value="hp" color="#ff9812" :width="'100%'" />
          </div>
        </div>
      </div>

      <!-- <div class="home-grade-wrapper">
        <div class="grade-item">
          <GradeBar />
        </div>
        <div class="grade-item">
          <GradeBar />
        </div>
        <div class="grade-item">
          <GradeBar />
        </div>
        <div class="grade-item">
          <GradeBar />
        </div>
        <div class="grade-item">
          <GradeBar />
        </div>
      </div> -->
      <div class="home-log-layout">
        <div class="home-log-nav">
          <n-tabs type="line" animated>
            <n-tab-pane name="item-log" tab="物品日志">
              <div class="home-item-log-wrapper">
                <div class="home-item-log" v-for="i in 10" :key="i">
                  <span class="log-time" style="margin-right: 10px;">12:17:55</span>
                  <span class="log-content">随机掉落了[金币] + 10</span>
                </div>
              </div>
            </n-tab-pane>
            <n-tab-pane name="activity-log" tab="活动日志">
              活动日志
            </n-tab-pane>
          </n-tabs>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { onMounted, onBeforeUnmount } from "vue";
import AttributeBar from "@/components/AttributeBar.vue";

const hp = ref(80);
onMounted(() => {
  document.body.style.backgroundColor = "#f9f9f9"; // 你想要的灰色
});

onBeforeUnmount(() => {
  document.body.style.backgroundColor = ""; // 恢复默认
});
</script>

<style lang="scss" scoped>
.home-container {
  height: 100%;
  min-height: 100vh;
  padding: 0 6%;
  background-color: $color-white-200;
  .home-layout {
    width: 100%;
    height: 100%;
    .home-panel-layout {
      .home-title-wrapper {
        padding: 15px 0;
        .home-title {
          font-size: 18px;
          text-align: center;
        }
      }
      .home-panel-wrapper {
        height: 35vh;
      }
    }
  }
  .home-log-layout {
    margin-top: 20px;
  }
}

.home-panel-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 0 15px;
  background-color: $color-white;
  .home-panel-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    column-gap: 20px;
    .home-panel-info {
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      align-items: center;
      height: 100%;
      .home-panel-image {
        margin-top: 10px;
      }
      .home-panel-grade .grade-value {
        font-size: 16px;
        font-weight: bold;
        color: $color-pink-100;
      }
    }
    .home-panel-stat {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      row-gap: 5px;
      .home-panel-view {
        display: flex;
        justify-content: space-between;
      }
      .attribute-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        span {
          width: 60px;
        }
      }
    }
  }
  .home-grade-detail {
  }
}

.home-grade-wrapper {
  height: 30%;
  margin-top: 15px;
  background-color: $color-white;
}

.home-log-nav {
  .home-item-log-wrapper {
    display: flex;
    flex-direction: column;
    row-gap: 10px;
  }
}
</style>