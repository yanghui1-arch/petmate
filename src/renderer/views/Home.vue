<template>
  <div class="home-container">
    <div class="home-layout">
      <div class="home-panel-layout">
        <!-- <div class="home-title-wrapper">
          <div class="home-title">
            角色状态
          </div>
        </div> -->
        <div class="home-panel-wrapper">
          <div class="home-panel-content">
            <div class="home-panel-info">
              <div class="home-panel-image">
                <!-- <n-image width="70" src="../assets/image/petmate.png" /> -->
                <n-avatar round :size="70" src="../assets/image/petmate.png" />
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
      <div class="home-package-layout">
        <div class="home-package-type">
          <button type="button">食物</button>
          <button>药品</button>
          <button>礼物</button>
          <button>饮料</button>
        </div>
        <div class="home-package-wrapper">
          <n-carousel :show-arrow="false" :show-dots="false" :loop="false" :transition-style="{ transitionDuration: '500ms', transitionTimingFunction: 'ease' }" ref="packagePageRef">
            <div class="home-package-content">
              <n-grid x-gap="5" y-gap="5" :cols="6">
                <n-gi v-for="(item, i) in packagePrevItemList" :key="i" style="display: flex; justify-content: center;">
                  <div class="package-item">
                    <n-image width="38" src="../assets/image/item/burger.png" preview-disabled />
                    <span class="package-item-num">99</span>
                  </div>
                </n-gi>
                <n-gi v-for="i in packagePageNum - packagePrevItemList.length" :key="i" style="display: flex; justify-content: center;">
                  <div class="package-item">
                  </div>
                </n-gi>
              </n-grid>
            </div>
            <div class="home-package-content">
              <n-grid x-gap="5" y-gap="5" :cols="6">
                <n-gi v-for="(item, i) in packageNextItemList" :key="i" style="display: flex; justify-content: center;">
                  <div class="package-item">
                    <n-image width="38" src="../assets/image/item/burger.png" preview-disabled />
                    <span class="package-item-num">99</span>
                  </div>
                </n-gi>
                <n-gi v-for="i in packagePageNum - packageNextItemList.length" :key="i" style="display: flex; justify-content: center;">
                  <div class="package-item">
                  </div>
                </n-gi>
              </n-grid>
            </div>
          </n-carousel>

          <div class="home-package-footer">
            <button class="prev-page" @click="prevPage">上一页</button>
            <button class="next-page" @click="nextPage">下一页</button>
          </div>
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
const packagePageNum = ref(18);
const packagePrevItemList = ref([
  { num: 10 },
  { num: 10 },
  { num: 10 },
  { num: 10 },
  { num: 10 },
  { num: 10 },
  { num: 10 },
]);
const packageNextItemList = ref([{ num: 10 }, { num: 10 }, { num: 10 }]);
onMounted(() => {
  document.body.style.backgroundColor = "#f9f9f9";
});

onBeforeUnmount(() => {
  document.body.style.backgroundColor = ""; // 恢复默认
});
const packagePageRef = ref(null);

const prevPage = () => {
  packagePageRef.value?.prev();
};

const nextPage = () => {
  packagePageRef.value?.next();
};
</script>

<style lang="scss" scoped>
.home-container {
  flex: 1;
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
    .home-package-layout {
      margin-top: 20px;
    }
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

.home-package-type {
  display: flex;
  column-gap: 5px;
  button {
    padding: 3px 15px;
    border: 1px solid $border-orange-300;
    border-bottom: none;
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    cursor: pointer;
  }
}

.home-package-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid $border-orange-300;
  padding: 10px;
  .home-package-content {
    width: 100%;
    .package-item {
      width: 50px;
      height: 50px;
      border: 1px solid $color-white;
      border-radius: 5px;
      border-style: groove;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      background-color: $border-orange-300;
      .package-item-num {
        position: absolute;
        bottom: 1px;
        right: 2px;
        font-size: 12px;
        color: $color-white;
      }
    }
  }

  .home-package-footer {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    column-gap: 10px;
    margin-top: 10px;
    .prev-page,
    .next-page {
      border: 1px solid $border-orange-300;
      padding: 2px 10px;
      cursor: pointer;
    }
  }
}
</style>