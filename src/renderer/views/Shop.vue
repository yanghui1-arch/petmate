<template>
  <div class="shop-container">
    <div class="shop-layout">
      <div class="shop-head-layout">
        <div class="shop-head-wrapper">
          <div class="shop-head-info">
            <div class="money-box">
              <span class="money-icon">💵</span>
              <span class="money-value">1999</span>
            </div>
            <div class="to-black-market">
              <span class="market-icon">🏪</span>
              黑市交易
            </div>
          </div>
        </div>
      </div>
      <div class="shop-content-layout">
        <div class="shop-type">
          <button
            type="button"
            v-for="item in shopTypeList"
            :key="item.name"
            @click="shopCurrType = item.name"
            :class="{ 'active-shop-type': shopCurrType === item.name }"
            class="type-btn"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="shop-content-wrapper">
          <div class="shop-prev-page-arrow" @click="prevPage">
            <n-image
              preview-disabled
              width="50"
              height="50"
              src="../assets/image/greater-than.png"
              style="transform: rotate(180deg)"
            ></n-image>
          </div>
          <div class="shop-next-page-arrow" @click="nextPage">
            <n-image
              preview-disabled
              width="50"
              height="50"
              src="../assets/image/greater-than.png"
            ></n-image>
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
              <div>
                <n-grid x-gap="5" y-gap="5" :cols="3">
                  <n-gi
                    v-for="i in shopPrevItemList"
                    :key="i"
                    style="
                      display: flex;
                      justify-content: center;
                      padding: 2px 0;
                    "
                  >
                    <div class="shop-item">
                      <div class="special-label">
                        <i class="fold-label"></i>
                        <span class="label-text">7折</span>
                      </div>
                      <div class="item-name">汉堡</div>
                      <n-image
                        width="38"
                        class="item-image"
                        src="../assets/image/item/burger.png"
                        preview-disabled
                      />
                      <div class="item-price-wrapper">
                        <span class="price-icon">💵</span>
                        <span class="item-price">200</span>
                      </div>
                    </div>
                  </n-gi>
                </n-grid>
              </div>
              <div>
                <n-grid x-gap="5" y-gap="5" :cols="3">
                  <n-gi
                    v-for="i in shopNextItemList"
                    :key="i"
                    style="
                      display: flex;
                      justify-content: center;
                      padding: 2px 0;
                    "
                  >
                    <div class="shop-item">
                      <div class="special-label">
                        <i class="fold-label"></i>
                        <span class="label-text">7折</span>
                      </div>
                      <div class="item-name">汉堡</div>
                      <n-image
                        width="38"
                        class="item-image"
                        src="../assets/image/item/burger.png"
                        preview-disabled
                      />
                      <div class="item-price-wrapper">
                        <span class="price-icon">💵</span>
                        <span class="item-price">200</span>
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
            :activeColor="'#f36912'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Pagedot from "@/components/Pagedot.vue";
const shopCurrType = ref("food");
const shopPageNum = ref(2);
const shopCurrPage = ref(1);
const shopPageSize = ref(6);
const shopPrevItemList = ref([
  { num: 10 },
  { num: 10 },
  { num: 10 },
  { num: 10 },
  { num: 10 },
  { num: 10 },
]);
const shopNextItemList = ref([{ num: 10 }, { num: 10 }, { num: 10 }]);

const shopTypeList = ref([
  { name: "hot", label: "🔥特卖" },
  { name: "food", label: "食物" },
  { name: "medicine", label: "药品" },
  { name: "gift", label: "礼物" },
  { name: "drink", label: "饮料" },
]);

const shopPageRef = ref(null);

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
</script>


<style lang="scss" scoped>
.shop-container {
  flex: 1;
  padding: 0 6%;
  background: linear-gradient(to bottom, #fdc07f 0%, #fed7aa 50%, #fff7ed 100%);
  // background: linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 100%);
  .shop-layout {
    width: 100%;
    height: 100%;
    .shop-head-layout {
      height: 32vh;
      // background: linear-gradient(
      //   135deg,
      //   #ff9a9e 0%,
      //   #fecfef 50%,
      //   #fecfef 100%
      // );
      // background: #fff;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(255, 154, 158, 0.3);
      margin-top: 10px;
      margin-bottom: 15px;
      border: none;
      position: relative;
      // overflow: hidden;
    }
    .shop-content-layout {
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

  .shop-head-info {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .money-box {
      width: 45%;
      display: flex;
      align-items: center;
      justify-content: center;
      column-gap: 5px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      border-radius: 25px;
      // border: 2px solid rgba(255, 255, 255, 0.3);
      padding: 5px 0;

      .money-icon {
        font-size: 16px;
        margin-top: -5px; // 对齐
      }

      .money-value {
        font-size: 14px;
        font-weight: bold;
        color: #8b4513;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
      }
    }

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
      cursor: pointer;
      transition: all 0.3s ease;
      // border: 2px solid rgba(255, 255, 255, 0.2);
      font-weight: 500;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
      }
    }
  }
}

.shop-type {
  display: flex;
  column-gap: 5px;
  margin-bottom: 5px;
  .type-btn {
    padding: 8px 0;
    flex: 1;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    transition: all 0.3s ease;
    background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
    color: #8b4513;
    box-shadow: 0 2px 10px rgba(253, 203, 110, 0.3);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(253, 203, 110, 0.4);
    }
  }
  .active-shop-type {
    background: linear-gradient(135deg, #ff7675 0%, #fd79a8 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(255, 118, 117, 0.4);
  }
}

.shop-content-wrapper {
  height: 52vh;
  padding: 0 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  // border: 1px solid $border-orange-300;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(253, 203, 110, 0.2);
  position: relative;
  backdrop-filter: blur(10px);

  .shop-prev-page-arrow,
  .shop-next-page-arrow {
    position: absolute;
    top: 50%;
    width: 50px;
    height: 50px;
    // background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    cursor: pointer;
    z-index: 10;
    // border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    // box-shadow: 0 6px 20px rgba(255, 118, 117, 0.4);
    transition: all 0.3s ease;
    border: none;

    &:hover {
      transform: translateY(-50%) scale(1.1);
      // box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4);
    }
  }

  .shop-prev-page-arrow {
    left: -30px;
    transform: translateY(-50%);
  }
  .shop-next-page-arrow {
    right: -30px;
    transform: translateY(-50%);
  }

  .shop-content-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    padding-bottom: 2px; // 防止页面抖动
    .sort-wrapper {
      .sort-select {
        padding: 3px 8px;
        font-size: 12px;
        border: 1px solid #ffeaa7;
        border-radius: 5px;
        background: white;
        color: #8b4513;
        cursor: pointer;
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
        cursor: pointer;
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
    .shop-item {
      width: 95px;
      height: 95px;
      border: 1px solid $color-white;
      border-radius: 5px;
      border-style: groove;
      display: flex;
      flex-direction: column;
      // justify-content: center;
      justify-content: space-between;
      align-items: center;
      position: relative;
      // background-color: $border-orange-300;
      background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
      transition: all 0.3s ease;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(255, 234, 167, 0.3);
      .special-label {
        position: absolute;
        top: 4px;
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
          background: linear-gradient(137deg, #ff5b5b 0%, #db0113 100%);
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
        background: white;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .item-name {
        width: 100%;
        font-size: 12px;
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
        column-gap: 5px;
        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        border-radius: 10px;
        color: #8b4513;
        font-weight: bold;
        .price-icon {
          margin-top: -3px; //对齐
        }
      }
    }
  }
}
</style>