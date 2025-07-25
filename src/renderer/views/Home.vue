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
            @click="handleTypeClick(item.name)"
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
              :key="'page' + index"
            >
              <n-grid x-gap="5" y-gap="5" :cols="6">
                <n-gi
                  v-for="item in page"
                  :key="item.id"
                  style="display: flex; justify-content: center"
                >
                  <div
                    class="package-item"
                    @mouseenter="showPopover($event, item)"
                    @mouseleave="hidePopover"
                    @click="showModal(item)"
                  >
                    <n-image width="38" :src="item.url" preview-disabled />
                    <span class="package-item-num">{{ item.count }}</span>
                  </div>
                </n-gi>

                <n-gi
                  v-for="i in packagePageSize - page.length"
                  :key="'empty' + i"
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
      :item="popoverItem"
    />
    <ItemModal
      v-model:show="isModalShow"
      :title="modalTitle"
      :item="modalItem"
      :hasCount="modalHasCount"
      :petmateId="currentPetmateID"
      type="use"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AttributeBar from "@/components/AttributeBar.vue";
import Pagedot from "@/components/Pagedot.vue";
import ItemPopover from "@/components/item/ItemPopover.vue";
import ItemModal from "@/components/item/ItemModal.vue";
import type { CarouselInst } from "naive-ui";
import { executeItemPage } from "../utils/item";
import { usePlayer } from "../hooks/usePlayer";
import { useShow } from "../hooks/useShow";
import { PackageItemInfo } from "../types/player";
import { ItemType, Item } from "../types/common";
const { playerData, consumeItem } = usePlayer();
const { getShopItems } = useShow();

const completeItemsMap = ref<Map<number, Item>>(new Map());

/**
 * 加载所有物品数据
 */
const loadCompleteItemsData = async () => {
  try {
    const itemTypes: ItemType[] = [
      "food",
      "medicine",
      "gift",
      "drink",
      "limit",
      "others",
    ];

    for (const type of itemTypes) {
      const items = await getShopItems(type);
      items.forEach((item) => {
        completeItemsMap.value.set(item.id, item);
      });
    }
  } catch (error) {
    console.error("Failed to load complete items data:", error);
  }
};

onMounted(async () => {
  await loadCompleteItemsData();
});

// Petmate相关
const currentPetmateID = ref(0);
const currentActivePetmate = computed(() => {
  return playerData.value?.petmates.find(
    (petmate) => petmate.id === currentPetmateID.value
  );
});

const petmateAttribute = computed(() => {
  return currentActivePetmate.value?.attrs;
});
const exp: Ref<number> = ref(petmateAttribute.value?.exp ?? 0);

// 背包相关
const packageCurrType = ref("food");
const packageCurrPage = ref(1);
const packagePageSize = ref(18);
const packageTypeList = ref([
  { name: "food" as ItemType, label: "🍔食物" },
  { name: "medicine" as ItemType, label: "💊药品" },
  { name: "gift" as ItemType, label: "🎁礼物" },
  { name: "drink" as ItemType, label: "🥤饮料" },
  { name: "limit" as ItemType, label: "⏰限时" },
  { name: "others" as ItemType, label: "其他" },
]);

const packagePageRef = ref<CarouselInst | null>(null);
/**
 * 响应式计算背包物品列表
 */
const packagePageList = computed(() => {
  const allItems = playerData.value?.items || [];
  const filteredPackageItems = allItems.filter(
    (item) => item.type === packageCurrType.value
  );
  return executeItemPage([...filteredPackageItems], packagePageSize.value);
});
const packagePageNum = computed(() => packagePageList.value.length);

/**
 * 点击分类
 * @param typeName 类别名称
 */
const handleTypeClick = (typeName: ItemType) => {
  packageCurrType.value = typeName;
  // 重置到第一页
  packageCurrPage.value = 1;
  if (packagePageRef.value) {
    packagePageRef.value.to(0);
  }
};

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
const popoverItem = ref<Item | null>(null);
const showPopover = (event: MouseEvent, item: PackageItemInfo) => {
  const target = event.currentTarget as HTMLElement;
  const rect = target?.getBoundingClientRect();
  // 经过实践，popoverX和popoverY暂时确定是悬浮框矩形 '底部中心' 的坐标
  popoverX.value = rect.x + rect.width / 2 + popoverWidth.value / 2;
  popoverY.value = rect.y + rect.height / 2;

  isItemEnter.value = true;
  // 根据id查询物品信息
  const completeItem = completeItemsMap.value.get(item.id);
  if (completeItem) {
    // 根据id查询物品信息
    popoverItem.value = {
      ...completeItem,
    };
  }
};

const hidePopover = () => {
  isItemEnter.value = false;
};

// 物品使用弹出框相关
const modalTitle = ref("请选择使用数量");
const isModalShow = ref(false);
const modalItem = ref<Item | null>(null);
const modalHasCount = ref(0);
const showModal = (item: PackageItemInfo) => {
  isModalShow.value = true;
  const completeItem = completeItemsMap.value.get(item.id);
  if (completeItem) {
    // 根据id查询物品信息
    modalItem.value = {
      ...completeItem,
    };
    modalHasCount.value = item.count;
  }
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
  row-gap: 6px;
  column-gap: 4px;
  margin-bottom: 5px;
  flex-wrap: wrap;
  .package-type-btn {
    // flex: 1;
    width: 24%;
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