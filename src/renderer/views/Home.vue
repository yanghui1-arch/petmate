<template>
  <div class="home-container">
    <div class="home-layout">
      <div class="home-panel-layout">
        <div class="home-title-wrapper">
          <div class="home-title">
            <span style="font-family: Petmate; font-size: 30px">Petmate</span>
            <!-- <span>の档案馆</span> -->
          </div>
        </div>
        <div class="home-panel-wrapper">
          <div class="home-panel-content">
            <div class="home-panel-info">
              <div class="home-panel-image">
                <!-- <n-image width="70" src="../assets/image/petmate.png" /> -->
                <n-avatar
                  round
                  :size="70"
                  src="../assets/image/petmate-1.jpg"
                  object-fit="cover"
                />
              </div>
              <div class="home-panel-grade">
                <span class="grade-value">LEVEL 1</span>
              </div>
            </div>
            <div class="home-panel-stat">
              <div class="home-panel-view">
                <span>Dass</span>
                <span style="width: 60%; text-align: center">(已喂养2天)</span>
              </div>

              <div class="attribute-item">
                <span>饱食度</span>
                <!-- <AttributeBar :value="hp" color="#ff9812" /> -->
                <AttributeBar :value="attributeHpDic.satiety" />
              </div>
              <div class="attribute-item">
                <span>精力</span>
                <AttributeBar :value="attributeHpDic.energy" />
              </div>
              <div class="attribute-item">
                <span>心情</span>
                <AttributeBar :value="attributeHpDic.mood" />
              </div>
              <div class="attribute-item">
                <span>健康</span>
                <AttributeBar :value="attributeHpDic.health" />
              </div>
            </div>
          </div>
          <div class="home-grade-detail">
            <AttributeBar :value="gradeHp" color="#e28fac" :width="'100%'" />
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
          <button
            type="button"
            v-for="item in packageTypeList"
            :key="item.name"
            @click="packageCurrType = item.name"
            :class="{ 'active-package-type': packageCurrType === item.name }"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="home-package-wrapper">
          <n-carousel
            :show-arrow="false"
            :show-dots="false"
            :loop="false"
            :transition-style="{
              transitionDuration: '500ms',
              transitionTimingFunction: 'ease',
            }"
            ref="packagePageRef"
          >
            <div class="home-package-content">
              <n-grid x-gap="5" y-gap="5" :cols="6">
                <n-gi
                  v-for="(item, i) in packagePrevItemList"
                  :key="i"
                  style="display: flex; justify-content: center"
                >
                  <div class="package-item">
                    <n-image
                      width="38"
                      src="../assets/image/item/burger.png"
                      preview-disabled
                    />
                    <span class="package-item-num">99</span>
                  </div>
                </n-gi>
                <n-gi
                  v-for="i in packagePageSize - packagePrevItemList.length"
                  :key="i"
                  style="display: flex; justify-content: center"
                >
                  <div class="package-item"></div>
                </n-gi>
              </n-grid>
            </div>
            <div class="home-package-content">
              <n-grid x-gap="5" y-gap="5" :cols="6">
                <n-gi
                  v-for="(item, i) in packageNextItemList"
                  :key="i"
                  style="display: flex; justify-content: center"
                >
                  <div class="package-item">
                    <n-image
                      width="38"
                      src="../assets/image/item/burger.png"
                      preview-disabled
                    />
                    <span class="package-item-num">99</span>
                  </div>
                </n-gi>
                <n-gi
                  v-for="i in packagePageSize - packageNextItemList.length"
                  :key="i"
                  style="display: flex; justify-content: center"
                >
                  <div class="package-item"></div>
                </n-gi>
              </n-grid>
            </div>
          </n-carousel>

          <div class="home-package-footer">
            <div class="home-package-footer-left">
              <Pagedot
                :pageNum="packagePageNum"
                :currentPage="packageCurrPage"
                :activeColor="'#914141'"
              />
            </div>
            <div class="home-package-footer-right">
              <button class="prev-page" @click="prevPage">上一页</button>
              <button class="next-page" @click="nextPage">下一页</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onMounted, onBeforeUnmount } from "vue";
import AttributeBar from "@/components/AttributeBar.vue";
import Pagedot from "@/components/Pagedot.vue";
import type { CarouselInst } from "naive-ui";

onMounted(() => {
  document.body.style.backgroundColor = "#f9f9f9";
});

onBeforeUnmount(() => {
  document.body.style.backgroundColor = ""; // 恢复默认
});

// 角色相關
const attributeHpDic = ref({
  satiety: 10,
  energy: 40,
  mood: 60,
  health: 100,
});
const gradeHp = ref(80);

// 背包相關
const packageCurrType = ref("food");
const packagePageNum = ref(2);
const packageCurrPage = ref(1);
const packagePageSize = ref(18);
const packageTypeList = ref([
  { name: "food", label: "🍔食物" },
  { name: "medicine", label: "💊药品" },
  { name: "gift", label: "🎁礼物" },
  { name: "drink", label: "🥤饮料" },
]);
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

const packagePageRef = ref<CarouselInst | null>(null);

const prevPage = () => {
  if (packageCurrPage.value > 1) {
    packageCurrPage.value--;
  }
  packagePageRef.value?.prev();
};

const nextPage = () => {
  if (packageCurrPage.value < packagePageNum.value) {
    packageCurrPage.value++;
  }
  packagePageRef.value?.next();
};
</script>

<style lang="scss" scoped>
.home-container {
  flex: 1;
  padding: 0 6%;
  background: $system-bgc;
  .home-layout {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    .home-panel-layout {
      // margin-top: 25px;
      .home-title-wrapper {
        padding: 0 0 5px 0;
        .home-title {
          font-size: 18px;
          text-align: center;
          color: $font-light;
        }
      }
      .home-panel-wrapper {
        height: 35vh;
        background: $content-bgc;
        border-radius: 8px;
        box-shadow: 0 4px 24px 0 rgba(253, 203, 110, 0.2);
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
  background-color: $content-bgc;
  .home-panel-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    column-gap: 15px;
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
        span {
          width: 60px;
          text-align: center;
          color: $font-light;
        }
      }
      .attribute-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        span {
          width: 60px;
          color: $font-light;
          font-weight: 500;
          letter-spacing: 3px;
          text-align: center;
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
  background-color: $content-bgc;
}

.home-package-type {
  display: flex;
  column-gap: 5px;
  margin-bottom: 5px;
  .active-package-type {
    background: linear-gradient(
      135deg,
      $btn-active-grad-start 0%,
      $btn-active-grad-end 100%
    );
    color: $color-white;
    box-shadow: 0 4px 15px rgba(255, 118, 117, 0.4);
  }
  button {
    flex: 1;
    background: linear-gradient(135deg, $btn-grad-start 0%, $btn-grad-end 100%);
    color: $accent-brown;
    border: none;
    border-radius: 20px;
    padding: 6px 0;
    font-weight: 500;
    box-shadow: 0 2px 10px rgba(253, 203, 110, 0.3);
    cursor: pointer;
    transition: all 0.3s ease;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(253, 203, 110, 0.4);
    }
  }
}

.home-package-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid $accent-brown;
  background: $content-bgc;
  border-radius: 5px;
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
      cursor: pointer;
      background: linear-gradient(135deg, $item-bg-start 0%, $item-bg-end 100%);
      box-shadow: 0 2px 8px 0 rgba(253, 203, 110, 0.15);
      .package-item-num {
        position: absolute;
        bottom: 1px;
        right: 2px;
        font-size: 12px;
        color: $accent-brown;
      }
    }
  }

  .home-package-footer {
    width: 100%;
    display: flex;
    justify-content: space-around;
    align-items: center;
    column-gap: 10px;
    margin-top: 10px;
    .home-package-footer-left,
    .home-package-footer-right {
      flex: 1;
      display: flex;
      justify-content: center;
    }
    .home-package-footer-right {
      justify-content: flex-start;
      column-gap: 10px;
      .prev-page,
      .next-page {
        border: 1px solid $color-white;
        padding: 3px 10px;
        cursor: pointer;
        border-radius: 3px;
        background: linear-gradient(
          135deg,
          $btn-grad-start 0%,
          $btn-grad-end 100%
        );
        box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.4),
          0 5px 15px rgba(0, 0, 0, 0.2);
        color: $accent-brown;
      }
    }
  }
}
</style>