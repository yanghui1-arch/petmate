<template>
  <div class="shop-container">
    <div class="shop-layout">
      <div class="shop-head-layout">
        <div class="shop-head-wrapper">
          <img
            src="../assets/image/shop-petmate.png"
            alt="petmate"
            style="flex: 1; max-height: 100%; object-fit: contain"
          />
        </div>
      </div>
      <!-- 黑市主体 -->
      <div class="shop-content-layout">
        <div class="shop-content-wrapper">
          <div class="shop-content-head-wrapper">
            <div class="shop-content-head-title">欢迎来到黑市</div>
            <div class="money-wrapper">
              <span class="money-icon">💵</span>
              <span class="money-value"> {{ playerData?.cash }}</span>
            </div>
          </div>
          <div class="shop-type-wrapper">
            <button
              type="button"
              v-for="shopType in shopTypeList"
              :key="shopType.name"
              @click="handleTypeClick(shopType.name)"
              :class="{ 'active-shop-type': shopCurrType === shopType.name }"
              class="shop-type-btn"
            >
              {{ shopType.label }}
            </button>
          </div>
          <div class="shop-content-head">
            <div class="sort-wrapper">
              <select class="sort-select">
                <option value="">默认排序</option>
                <option value="">按等级升序</option>
                <option value="">按等级降序</option>
                <option value="">按价格升序</option>
                <option value="">按价格降序</option>
              </select>
            </div>

            <div class="search-wrapper">
              <input
                type="text"
                class="search-input"
                placeholder="请输入商品关键词"
              />
              <button class="search-btn">搜索</button>
            </div>
          </div>
          <div class="shop-content">
            <div class="shop-prev-page-arrow" @click="prevPage">
              <n-image
                preview-disabled
                width="40"
                height="40"
                src="../assets/image/greater-than.png"
                style="transform: rotate(180deg)"
              ></n-image>
            </div>
            <div class="shop-next-page-arrow" @click="nextPage">
              <n-image
                preview-disabled
                width="40"
                height="40"
                src="../assets/image/greater-than.png"
              ></n-image>
            </div>
            <n-carousel
              :show-arrow="false"
              :show-dots="false"
              :loop="false"
              :transition-style="{
                transitionDuration: '500ms',
                transitionTimingFunction: 'ease',
              }"
              ref="shopPageRef"
            >
              <div v-for="(page, index) in shopPageList" :key="index">
                <n-grid x-gap="5" y-gap="5" :cols="3">
                  <n-gi
                    v-for="item in page"
                    :key="item.id"
                    style="
                      display: flex;
                      justify-content: center;
                      padding: 2px 0;
                    "
                  >
                    <div
                      class="shop-item"
                      @mouseenter="showPopover($event)"
                      @mouseleave="hidePopover"
                      @click="showModal(item)"
                    >
                      <div class="special-label">
                        <i class="fold-label"></i>
                        <span class="label-text">7折</span>
                      </div>
                      <div class="item-name">{{ item.name }}</div>
                      <n-image
                        width="38"
                        class="item-image"
                        :src="item.url"
                        preview-disabled
                      />
                      <div class="item-price-wrapper">
                        <span class="price-icon">💵</span>
                        <span class="item-price">{{ item.price }}</span>
                      </div>
                    </div>
                  </n-gi>
                </n-grid>
              </div>
            </n-carousel>
          </div>
          <Pagedot
            :pageNum="shopPageNum"
            :currentPage="shopCurrPage"
            :activeColor="'#914141'"
          />
        </div>
      </div>
    </div>
    <!-- 商品的悬浮提示框，手动控制显示 -->
    <ItemPopover
      :popoverX="popoverX"
      :popoverY="popoverY"
      :show="isItemEnter"
      :popoverWidth="popoverWidth"
    />
    <!-- 商品购买弹出框 -->
    <ItemModal
      v-model:show="isModalShow"
      :title="modalTitle"
      :item="modalItem"
      type="buy"
    />
  </div>
</template>

<script setup lang="ts">
import Pagedot from "@/components/Pagedot.vue";
import ItemPopover from "@/components/ItemPopover.vue";
import ItemModal from "@/components/ItemModal.vue";
import { usePlayer } from "../hooks/usePlayer";
import { useShow } from "../hooks/useShow";
import { ItemType, Item } from "../types/common";
import { executeItemPage } from "../utils/item";

const { buyItem, playerData } = usePlayer();
const { getShopItems } = useShow();

const shopCurrType = ref<ItemType>("hot" as ItemType);
const shopPageNum = ref(0);
const shopCurrPage = ref(1);
const shopPageSize = ref(6);
const shopPageList = ref<Item[][]>([]);

// 初始化商品类型和显示默认的商品类型的商品列表
onMounted(async () => {
  prepareShopData();
});

// 准备商品数据
const prepareShopData = async () => {
  const shopItemList = await getShopItems(shopCurrType.value);
  shopPageList.value = executeItemPage(shopItemList, shopPageSize.value);
  shopPageNum.value = shopPageList.value.length;
};

// 点击切换商品类型
const handleTypeClick = async (typeName: ItemType) => {
  shopCurrType.value = typeName;
  prepareShopData();
};

const shopTypeList = ref([
  { name: "hot" as ItemType, label: "🔥特卖" },
  { name: "food" as ItemType, label: "食物" },
  { name: "medicine" as ItemType, label: "药品" },
  { name: "gift" as ItemType, label: "礼物" },
  { name: "drink" as ItemType, label: "饮料" },
]);

const shopPageRef = ref<InstanceType<typeof NCarousel> | null>(null);

const prevPage = () => {
  if (shopCurrPage.value > 1) {
    shopCurrPage.value--;
  }
  shopPageRef.value?.prev();
};

const nextPage = () => {
  if (shopCurrPage.value < shopPageNum.value) {
    shopCurrPage.value++;
  }
  shopPageRef.value?.next();
};

// 鼠标离开商品或悬浮框内容时，悬浮框消失
const isItemEnter = ref(false);
const isPopoverEnter = ref(false);
const popoverX = ref(0);
const popoverY = ref(0);
const popoverWidth = ref(180);
const popoverHeight = ref(130);
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

// 物品购买弹出框相关
const modalTitle = ref("请选择购买数量");
const isModalShow = ref(false);
const modalItem = ref<Item | null>(null);
const showModal = (shopItem: Item) => {
  isModalShow.value = true;
  modalItem.value = shopItem;
};
</script>


<style lang="scss" scoped>
.shop-container {
  flex: 1;
  padding: 0 6%;
  background: #231e1f;
  .shop-layout {
    width: 100%;
    height: 100%;
    .shop-head-layout {
      height: 32vh;
      border-radius: 20px;
      margin-bottom: -10px;
      border: none;
      position: relative;
    }
    .shop-content-layout {
      position: relative;
      z-index: 10;
    }
  }
}

.shop-head-wrapper {
  padding: 0 15px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  position: relative;
  .shop-head-title {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .shop-title {
      font-size: 24px;
      font-weight: bold;
      color: #8b4513;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    }

    .shop-subtitle {
      font-size: 12px;
      color: #a0522d;
      opacity: 0.9;
    }
  }

  .shop-head-info {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .to-black-market {
      width: 45%;
      display: flex;
      align-items: center;
      justify-content: center;
      column-gap: 5px;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      padding: 5px 0;
      color: white;
      border-radius: 20px;
      transition: all 0.3s ease;
      font-weight: 500;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
      }
    }
  }

  .shop-head-notice {
    background: rgba(255, 255, 255, 0.9);
    border-radius: 10px;
    padding: 5px 15px;
    border: 1px solid rgba(255, 255, 255, 0.3);

    .notice-header {
      display: flex;
      align-items: center;
      column-gap: 5px;
      font-weight: bold;
      color: #8b4513;

      .notice-icon {
        font-size: 16px;
        margin-top: -4px; // 对齐
      }
    }

    .notice-content {
      color: #a0522d;
      font-size: 13px;
    }
  }
}

.shop-content-wrapper {
  height: 66vh;
  padding: 0 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  background: #55484b;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(253, 203, 110, 0.2);
  position: relative;
  backdrop-filter: blur(10px);
  .shop-content-head-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .shop-content-head-title {
    font-size: 24px;
    font-weight: bold;
    color: #e0a6a6;
  }
  .money-wrapper {
    column-gap: 5px;
    border-radius: 25px;
    padding: 0 10px;

    .money-icon {
      font-size: 22px;
      margin-top: -5px; // 对齐
    }

    .money-value {
      font-size: 16px;
      font-weight: bold;
      color: #fff;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
    }
  }
  .shop-type-wrapper {
    width: 100%;
    display: flex;
    column-gap: 5px;
    margin-bottom: 5px;
    .shop-type-btn {
      padding: 8px 0;
      flex: 1;
      border: none;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      text-align: center;
      transition: all 0.3s ease;
      background: linear-gradient(135deg, #f7f5f5 0%, #fad2d2 100%);
      color: #8b4513;
      box-shadow: 0 2px 10px rgba(253, 203, 110, 0.3);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(253, 203, 110, 0.4);
      }
    }
    // active优先级更高，放后面
    .active-shop-type {
      background: linear-gradient(135deg, #ff7675 0%, #fd79a8 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(255, 118, 117, 0.4);
    }
  }
  .shop-content-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    padding-bottom: 2px;
    .sort-wrapper {
      .sort-select {
        padding: 3px 8px;
        font-size: 12px;
        border: 1px solid #ffeaa7;
        border-radius: 5px;
        background: white;
        color: #8b4513;
        transition: all 0.3s ease;
        &:focus {
          border-color: #ff7675;
          box-shadow: 0 0 0 3px rgba(255, 118, 117, 0.1);
          outline: none;
        }
      }
    }
    .search-wrapper {
      flex: 1;
      display: flex;
      justify-content: flex-end;
      column-gap: 5px;
      .search-input {
        width: 65%;
        font-size: 12px;
        padding: 3px 4px;
        border: 1px solid #ffeaa7;
        border-radius: 5px;
        background: white;
        color: #8b4513;
        transition: all 0.3s ease;

        &:focus {
          border-color: #ff7675;
          box-shadow: 0 0 0 3px rgba(255, 118, 117, 0.1);
          outline: none;
        }

        &::placeholder {
          color: #a0522d;
        }
      }
      .search-btn {
        padding: 1px 10px;
        background: linear-gradient(135deg, #ff7675 0%, #fd79a8 100%);
        border: none;
        border-radius: 5px;
        color: white;
        font-size: 12px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 118, 117, 0.3);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 118, 117, 0.4);
        }
      }
    }
  }
  .shop-content {
    width: 100%;
    height: 205px; // 固定高度，防止商品数量不足时，高度变化
    position: relative;
    .shop-prev-page-arrow,
    .shop-next-page-arrow {
      position: absolute;
      top: 50%;
      width: 40px;
      height: 40px;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      transition: all 0.3s ease;
      border: none;

      &:hover {
        transform: translateY(-50%) scale(1.2);
      }
    }

    .shop-prev-page-arrow {
      left: -32px;
      transform: translateY(-50%);
    }
    .shop-next-page-arrow {
      right: -32px;
      transform: translateY(-50%);
    }
    .shop-item {
      width: 95px;
      height: 95px;
      border: 1px solid $color-white;
      border-radius: 5px;
      border-style: groove;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      position: relative;
      background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(255, 234, 167, 0.3);
      .special-label {
        position: absolute;
        top: 5px;
        left: -3px;
        width: 100%;
        max-width: 120px;
        .fold-label {
          display: block;
          width: 2px;
          height: 5px;
          background: #db0113;
          transform: skewY(-40deg);
          position: absolute;
          top: -1px;
          left: 0;
          z-index: 0;
        }
        .label-text {
          position: absolute;
          z-index: 1;
          display: block;
          padding: 0 8px;
          height: 20px;
          background: #c55151;
          border-radius: 0 20px 20px 0;
          color: #fff;
          text-align: center;
          font-size: 12px;
          overflow: hidden;
        }
      }
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(255, 234, 167, 0.5);
        border-color: #ff7675;
      }

      .item-image {
        border-radius: 10px;
      }

      .item-name {
        width: 100%;
        font-size: 14px;
        text-align: center;
        color: #8b4513;
        font-weight: 600;
        padding: 5px 0;
        border-bottom: 1px solid #8b4513;
      }

      .item-price-wrapper {
        width: 100%;
        font-size: 12px;
        display: flex;
        justify-content: center;
        align-items: center;
        column-gap: 2px;
        border-radius: 10px;
        color: #8b4513;
        font-weight: bold;
        .price-icon {
          font-size: 14px;
          margin-top: -3px; //对齐
        }
      }
    }
    .shop-item-popover {
      width: 100px;
      height: 100px;
      background: #fff;
      border-radius: 10px;
    }
  }
}

// 商品悬浮框
.popover-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 3px;
  background: #55484b;
  border: 1px solid #f39c12;
  box-shadow: 0 12px 35px rgba(243, 156, 18, 0.4),
    0 0 20px rgba(243, 156, 18, 0.2), inset 0 1px 3px rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  position: relative;
  overflow: hidden;

  .popover-title {
    width: 100%;
    font-weight: bold;
    color: #f39c12;
    text-align: center;
    padding: 4px 0;
    background: linear-gradient(
      135deg,
      rgba(243, 156, 18, 0.1),
      rgba(230, 126, 34, 0.1)
    );
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    font-size: 13px;
  }
  .popover-content {
    width: 100%;
    flex: 1;
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;

    .popover-description,
    .popover-tip {
      color: #ecf0f1;
      font-size: 11px;
      text-align: center;
      margin-bottom: 8px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
      opacity: 0.9;
    }

    .popover-description {
      color: #e0a6a6;
      margin-bottom: 20px;
    }

    .popover-effect {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;

      row-gap: 4px;

      span {
        color: #27ae60;
        font-weight: 600;
        font-size: 11px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid rgba(39, 174, 96, 0.3);
        min-width: 70px;
        text-align: center;
        transition: all 0.2s ease;

        &:hover {
          border-color: rgba(39, 174, 96, 0.5);
        }
      }
    }
  }
}
</style>