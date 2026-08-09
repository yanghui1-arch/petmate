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
                <button
                  v-if="equippedTitle || ownedTitles.length > 0"
                  type="button"
                  class="home-player-title-slot"
                  :class="{
                    'home-player-title-slot-empty': !equippedTitle,
                    'home-player-title-slot-clickable': equippedTitle,
                  }"
                  aria-label="选择称号"
                  @click="openTitleSelector"
                >
                  <img
                    v-if="equippedTitle"
                    class="home-player-title-image"
                    :src="equippedTitle.image"
                    :alt="equippedTitle.name"
                  />
                </button>
                <n-avatar
                  round
                  :size="70"
                  :src="avator"
                  object-fit="cover"
                />
              </div>
              <div class="home-panel-grade">
                <span>{{ currentActivePetmate?.name }}</span>
                <span class="grade-value"
                  >LEVEL {{ petmateAttribute?.level }}</span
                >
              </div>
            </div>
            <div class="home-panel-attribute">
              <div class="home-panel-view">
                <div class="home-panel-buff" v-for="(buffItem, index) in petmateAttribute?.buffs"
                    :key="'buff-icon-' + buffItem.buff.id"
                    @mouseenter="handleBuffPopover($event, buffItem, index)">
                  <n-image
                    :src="getImageURL('buff', buffItem.buff.icon) ?? ''"
                    width="24"
                    height="24"
                    preview-disabled
                  />
                </div>
              </div>

              <div class="attribute-item">
                <span>饱食度</span>
                <!-- <AttributeBar :value="hp" color="#ff9812" /> -->
                <AttributeBar
                  :value="petmateAttribute?.hungry ?? 0"
                  :max="petmateAttribute?.maxHungry ?? 100"
                />
              </div>
              <div class="attribute-item">
                <span>精力</span>
                <AttributeBar
                  :value="petmateAttribute?.energy ?? 0"
                  :max="petmateAttribute?.maxEnergy ?? 100"
                />
              </div>
              <div class="attribute-item">
                <span>心情</span>
                <AttributeBar
                  :value="petmateAttribute?.emotion ?? 0"
                  :max="petmateAttribute?.maxEmotion ?? 100"
                />
              </div>
              <div class="attribute-item">
                <span>健康</span>
                <AttributeBar
                  :value="petmateAttribute?.health ?? 0"
                  :max="petmateAttribute?.maxHealth ?? 100"
                />
              </div>
            </div>
          </div>
          <div class="home-grade-detail">
            <AttributeBar
              :value="petmateAttribute?.exp ?? 0"
              color="#e28fac"
              :width="'100%'"
              :max="petmateAttribute?.nextExp ?? 100"
            />
          </div>
        </div>
      </div>
      <div class="home-package-layout">
        <div class="home-package-type">
          <button
            type="button"
            v-for="packageType in packageTypeList"
            :key="packageType.name"
            @click="handleTypeClick(packageType.name)"
            :class="{ 'active-package-type': packageCurrType === packageType.name }"
            class="package-type-btn"
          >
            {{ packageType.label }}
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
                    :class="{ 'package-item-unusable': !canUsePackageItem(item) }"
                    @mouseenter="handleItemPopover($event, item)"
                    @click="showModal(item)"
                  >
                    <n-image width="38" :src="getImageURL('item', item.url) ?? ''" preview-disabled />
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
    <BuffPopover
      :popoverX="popoverX"
      :popoverY="popoverY"
      :show="isBuffEnter"
      :popoverWidth="popoverWidth"
      :activeBuff="popoverBuff!"
    />
    <ItemPopover
      :popoverX="popoverX"
      :popoverY="popoverY"
      :show="isItemEnter"
      :popoverWidth="popoverWidth"
      :isSourceShow="true"
      :isRequirementShow="false"
      :item="popoverItem!"
    />
    <ItemModal
      v-model:show="isModalShow"
      :title="modalTitle"
      :item="modalItem!"
      :hasCount="modalHasCount"
      :petmateId="currentPetmateID"
      type="use"
    />
    <n-modal v-model:show="isTitleModalShow" transform-origin="center">
      <div class="title-select-modal">
        <button
          v-for="title in ownedTitles"
          :key="title.id"
          type="button"
          class="title-select-option"
          :class="{ 'title-select-option-active': title.id === equippedTitleId }"
          :disabled="isEquippingTitle"
          @click="equipTitle(title.id)"
        >
          <img class="title-select-image" :src="title.image" :alt="title.name" />
        </button>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AttributeBar from "@/components/AttributeBar.vue";
import Pagedot from "@/components/Pagedot.vue";
import BuffPopover from "@/components/buff/BuffPopover.vue";
import ItemPopover from "@/components/item/ItemPopover.vue";
import ItemModal from "@/components/item/ItemModal.vue";
import type { CarouselInst } from "naive-ui";
import type { PlayerResourceState } from "@main/types/player-resource";
import { canUseItemFromPackage, executePackageItemPage } from "../utils/item";
import { usePlayer } from "../hooks/usePlayer";
import { useShow } from "../hooks/useShow";
import { showItemPopover, showBuffPopover, popoverX, popoverY, popoverWidth, popoverItem, isItemEnter, popoverBuff, isBuffEnter, openMessageModal } from "../hooks/useInteract";
import { PackageItemInfo } from "../types/player";
import { getPrimaryItemType, ItemType, Item, ActiveBuff } from "../types/common";
import avator from "../assets/image/youmei-avatar.png";
import holidayCraftspersonTitleImage from "../assets/title/假日小工匠.png";
import winningDuoTitleImage from "../assets/title/假期连胜搭子.png";
import dawnGuardianTitleImage from "../assets/title/曙光守护者.png";

type TitleViewModel = {
  id: string;
  name: string;
  image: string;
};

const TITLE_CATALOG: TitleViewModel[] = [
  {
    id: "labor-2026-holiday-craftsperson",
    name: "假日小工匠",
    image: holidayCraftspersonTitleImage,
  },
  {
    id: "labor-2026-sunny-guardian",
    name: "曙光守护者",
    image: dawnGuardianTitleImage,
  },
  {
    id: "labor-2026-winning-duo",
    name: "假期连胜搭子",
    image: winningDuoTitleImage,
  },
];

const { playerData, consumeItem } = usePlayer();
const { getAllItems, getImageURL } = useShow();

// 物品id -> 物品信息，用于物品信息悬浮框和使用弹出框
const completeItemsMap = ref<Map<number, Item>>(new Map());
const playerResources = ref<PlayerResourceState | null>(null);

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
      const items = await getAllItems(type);
      items.forEach((item) => {
        completeItemsMap.value.set(item.id, item);
      });
    }
  } catch (error) {
    console.error("Failed to load complete items data:", error);
  }
};

onMounted(async () => {
  await Promise.all([loadCompleteItemsData(), refreshPlayerResources()]);
  window.api.onPlayerResourcesUpdated((_, resources) => {
    playerResources.value = resources;
  });
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

// 称谓相关
const isTitleModalShow = ref(false);
const isEquippingTitle = ref(false);

const ownedTitleIds = computed(() => {
  return new Set(playerResources.value?.titles.map((title) => title.id) ?? []);
});

const ownedTitles = computed(() =>
  TITLE_CATALOG.filter((title) => ownedTitleIds.value.has(title.id))
);

const equippedTitleId = computed(() => playerResources.value?.equippedTitleId ?? null);

const equippedTitle = computed(() => {
  if (!equippedTitleId.value) return null;
  return ownedTitles.value.find((title) => title.id === equippedTitleId.value) ?? null;
});

const refreshPlayerResources = async () => {
  const response = await window.api.getPlayerResources();
  if (response.code === 200 && response.data) {
    playerResources.value = response.data;
  }
};

const openTitleSelector = () => {
  if (ownedTitles.value.length === 0) return;
  isTitleModalShow.value = true;
};

const equipTitle = async (titleId: string) => {
  if (isEquippingTitle.value) return;
  if (titleId === equippedTitleId.value) {
    isTitleModalShow.value = false;
    return;
  }

  isEquippingTitle.value = true;
  try {
    const response = await window.api.equipPlayerTitle(titleId);
    if (response.code === 200 && response.data) {
      playerResources.value = response.data;
      isTitleModalShow.value = false;
    }
  } catch (error) {
    console.error("设置称谓失败:", error);
  } finally {
    isEquippingTitle.value = false;
  }
};

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
    (item) => getPrimaryItemType(item.type) === packageCurrType.value
  );
  return executePackageItemPage([...filteredPackageItems], packagePageSize.value);
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



const handleItemPopover = (event: MouseEvent, item: PackageItemInfo) => {
  // 根据id查询物品信息
  const completeItem = completeItemsMap.value.get(item.id);
  if (completeItem) {
    // 根据id查询物品信息
    showItemPopover(event, completeItem);
  }
};

const handleBuffPopover = (event: MouseEvent, buff: ActiveBuff, index: number) => {
  showBuffPopover(event, buff, index);
};

const canUsePackageItem = (item: PackageItemInfo) => {
  const completeItem = completeItemsMap.value.get(item.id);
  return completeItem ? canUseItemFromPackage(completeItem) : canUseItemFromPackage(item);
};

// 物品使用弹出框相关
const modalTitle = ref("请选择使用数量");
const isModalShow = ref(false);
const modalItem = ref<Item | null>(null);
const modalHasCount = ref(0);
const showModal = (item: PackageItemInfo) => {
  const completeItem = completeItemsMap.value.get(item.id);
  if (!completeItem) {
    return;
  }
  if (!canUseItemFromPackage(completeItem)) {
    openMessageModal("fail", "该物品不能在背包中直接使用");
    return;
  }
  isModalShow.value = true;
  // 根据id查询物品信息
  modalItem.value = {
    ...completeItem,
  };
  modalHasCount.value = item.count;
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
        margin-top: 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        row-gap: 4px;
      }
      .home-panel-grade {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: $color-pink-100;
      }
      .home-panel-grade .grade-value {
        font-size: 16px;
        font-weight: bold;
        color: $color-pink-100;
      }
      .home-player-title-slot {
        width: 152px;
        height: 54px;
        padding: 0;
        border: none;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .home-player-title-slot-clickable {
        cursor: pointer;
        transition: transform 0.18s ease, filter 0.18s ease;

        &:hover {
          transform: translateY(-2px) scale(1.02);
          filter: brightness(1.06)
            drop-shadow(0 4px 6px rgba(243, 166, 189, 0.42));
        }

        &:active {
          transform: translateY(0) scale(0.99);
        }

        &:focus-visible {
          outline: 2px solid #f3a6bd;
          outline-offset: 2px;
          border-radius: 6px;
        }
      }
      .home-player-title-slot-empty {
        opacity: 0;
      }
      .home-player-title-image {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: contain;
      }
    }
    .home-panel-attribute {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      row-gap: 5px;
      .home-panel-view {
        width: 100%;
          display: flex;
          align-items: center;
          column-gap: 5px;
          justify-content: flex-end;
          .home-panel-buff {
            background-color: #f5f5dc;
            border-radius: 5px;
            display: flex;
            align-items: center;
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
      &.package-item-unusable {
        cursor: not-allowed;
        opacity: 0.85;
      }
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

.title-select-modal {
  width: min(360px, calc(100vw - 40px));
  padding: 16px;
  border-radius: 8px;
  background: $content-bgc;
  display: flex;
  flex-direction: column;
  row-gap: 10px;
  box-shadow: 0 12px 32px rgba(80, 58, 64, 0.26);
}

.title-select-option {
  width: 100%;
  height: 86px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.72);
  border-radius: 8px;
  background: transparent;
  overflow: hidden;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: #f3a6bd;
  }

  &:disabled {
    cursor: default;
  }
}

.title-select-option-active {
  border-color: #ff7675;
  box-shadow: 0 0 0 2px rgba(255, 118, 117, 0.24);
}

.title-select-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}
</style>
