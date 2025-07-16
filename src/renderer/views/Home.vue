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
                <n-avatar
                  round
                  :size="70"
                  src="../assets/image/petmate-1.jpg"
                  object-fit="cover"
                />
              </div>
              <div class="home-panel-grade">
                <span class="grade-value"
                  >LEVEL {{ petmateAttribute?.level }}</span
                >
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
                <AttributeBar
                  :value="petmateAttribute?.hungry ?? 0"
                  :max="petmateAttribute?.max_hungry ?? 100"
                />
              </div>
              <div class="attribute-item">
                <span>精力</span>
                <AttributeBar
                  :value="petmateAttribute?.energy ?? 0"
                  :max="petmateAttribute?.max_energy ?? 100"
                />
              </div>
              <div class="attribute-item">
                <span>心情</span>
                <AttributeBar
                  :value="petmateAttribute?.emotion ?? 0"
                  :max="petmateAttribute?.max_emotion ?? 100"
                />
              </div>
              <div class="attribute-item">
                <span>健康</span>
                <AttributeBar
                  :value="petmateAttribute?.health ?? 0"
                  :max="petmateAttribute?.max_health ?? 100"
                />
              </div>
            </div>
          </div>
          <div class="home-grade-detail">
            <AttributeBar
              :value="exp"
              color="#e28fac"
              :width="'100%'"
              :max="petmateAttribute?.next_exp ?? 100"
            />
          </div>
        </div>
      </div>
      <div class="home-package-layout">
        <div class="home-package-type">
          <button
            type="button"
            v-for="item in packageTypeList"
            :key="item.name"
            @click="packageCurrType = item.name"
            :class="{ 'active-package-type': packageCurrType === item.name }"
            class="package-type-btn"
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
            <div
              class="home-package-content"
              v-for="(page, index) in packagePageList"
              :key="index"
            >
              <n-grid x-gap="5" y-gap="5" :cols="6">
                <n-gi
                  v-for="item in page"
                  :key="item.id"
                  style="display: flex; justify-content: center"
                >
                  <div
                    class="package-item"
                    @mouseenter="showPopover($event)"
                    @mouseleave="hidePopover"
                    @click="showModal(item)"
                  >
                    <n-image width="38" :src="item.url" preview-disabled />
                    <span class="package-item-num">{{ item.count }}</span>
                  </div>
                </n-gi>
                <n-gi
                  v-for="i in packagePageSize - page.length"
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
    <ItemPopover
      :popoverX="popoverX"
      :popoverY="popoverY"
      :show="isItemEnter"
      :popoverWidth="popoverWidth"
      :isSourceShow="true"
    />
    <ItemModal
      v-model:show="isModalShow"
      :title="modalTitle"
      :item="modalItem"
      type="use"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onMounted, onBeforeUnmount } from "vue";
import AttributeBar from "@/components/AttributeBar.vue";
import Pagedot from "@/components/Pagedot.vue";
import ItemPopover from "@/components/ItemPopover.vue";
import ItemModal from "@/components/ItemModal.vue";
import type { CarouselInst } from "naive-ui";
import { executeItemPage } from "../utils/item";
import { usePlayer } from "../hooks/usePlayer";
import { PackageItemInfo } from "../types/player";
import { PetMate, PetMateAttribute } from "../types/petmate";

const packagePageList = ref<PackageItemInfo[][]>([]);

onMounted(() => {
  preparePackageData();
});

// 准备背包数据
const preparePackageData = async () => {
  const playerItems: PackageItemInfo[] = [...(playerData.value?.items || [])];
  packagePageList.value = executeItemPage(playerItems, packagePageSize.value);
  packagePageNum.value = packagePageList.value.length;
};

const { playerData, consumeItem } = usePlayer();

// Petmate相关
const currentPetmateID = 0;
const currentActivePetmate = ref<PetMate | undefined>(
  playerData.value?.petmates.filter(
    (petmate) => petmate.id === currentPetmateID
  )[0] as PetMate
);
const petmateAttribute = ref<PetMateAttribute | undefined>(
  currentActivePetmate.value?.attrs
);

const exp: Ref<number> = ref(petmateAttribute.value?.exp ?? 0);

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

// 只是用来占位的，里面是什么东西无所谓，只要长度正确即可
const packageNextItemList = ref(new Array(18).fill(0));

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

// 物品信息悬浮框相关
const popoverX = ref(0);
const popoverY = ref(0);
const isItemEnter = ref(false);
const popoverWidth = ref(180);
const showPopover = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement;
  const rect = target?.getBoundingClientRect();
  // 经过实践，popoverX和popoverY暂时确定是悬浮框矩形 '底部中心' 的坐标
  popoverX.value = rect.x + rect.width / 2 + popoverWidth.value / 2;
  popoverY.value = rect.y + rect.height / 2;

  isItemEnter.value = true;
};

const hidePopover = () => {
  isItemEnter.value = false;
};

// 物品使用弹出框相关
const modalTitle = ref("请选择使用数量");
const isModalShow = ref(false);
const modalItem = ref<PackageItemInfo | null>(null);
const showModal = (pItem: PackageItemInfo) => {
  isModalShow.value = true;
  modalItem.value = pItem;
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

.home-package-type {
  display: flex;
  column-gap: 5px;
  margin-bottom: 5px;
  .package-type-btn {
    flex: 1;
    background: linear-gradient(135deg, $btn-grad-start 0%, $btn-grad-end 100%);
    color: $accent-brown;
    border: none;
    border-radius: 20px;
    padding: 6px 0;
    font-weight: 500;
    box-shadow: 0 2px 10px rgba(253, 203, 110, 0.3);
    transition: all 0.3s ease;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(253, 203, 110, 0.4);
    }
  }
  // active优先级更高，放后面
  .active-package-type {
    background: linear-gradient(
      135deg,
      $btn-active-grad-start 0%,
      $btn-active-grad-end 100%
    );
    color: $color-white;
    box-shadow: 0 4px 15px rgba(255, 118, 117, 0.4);
  }
}

.home-package-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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