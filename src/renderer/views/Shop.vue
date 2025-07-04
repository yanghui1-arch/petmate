<template>
  <div class="shop-container">
    <div class="shop-layout">
      <div class="shop-head-layout">
        <div class="shop-head-wrapper">
          <div class="shop-head-title"></div>
          <div class="shop-head-info">
            <div class="money-box">
              <span class="money-icon">$</span>
              <span class="money-value">1999</span>
            </div>
            <div class="to-black-market">去黑市
              <!-- <router-link to="/settings" class="page-navigator-item" @click="show = false">设置</router-link> -->
            </div>
          </div>
          <div class="shop-head-notice">告示栏
          </div>
        </div>
      </div>
      <div class="shop-content-layout">
        <div class="shop-type">
          <button>特卖</button>
          <button type="button">食物</button>
          <button>药品</button>
          <button>礼物</button>
          <button>饮料</button>
        </div>
        <div class="shop-content-wrapper">
          <div class="shop-prev-page-arrow" @click="prevPage">&lt;</div>
          <div class="shop-next-page-arrow" @click="nextPage">&gt;</div>
          <div class="shop-content-head">
            <select>
              <option value="">默认排序</option>
              <option value="">按等级升序</option>
              <option value="">按等级降序</option>
              <option value="">按钱币升序</option>
              <option value="">按钱币降序</option>
            </select>

            <div class="search-wrapper">
              <input type="text" placeholder="请输入商品关键词" />
              <button>搜索</button>
            </div>
          </div>
          <div class="shop-content">
            <n-carousel :show-arrow="false" :show-dots="false" :loop="false" :transition-style="{ transitionDuration: '500ms', transitionTimingFunction: 'ease' }" ref="shopPageRef">
              <div>
                <n-grid x-gap="5" y-gap="5" :cols="3">
                  <n-gi v-for="i in shopPrevItemList" :key="i" style="display: flex; justify-content: center;">
                    <div class="shop-item">
                      <div class="item-name">汉堡</div>
                      <n-image width="38" class="item-image" src="../assets/image/item/burger.png" preview-disabled />
                      <div class="item-price-wrapper">
                        <span class="price-icon">$</span>
                        <span class="item-price">200</span>
                      </div>
                    </div>
                  </n-gi>
                </n-grid>
              </div>
              <div>
                <n-grid x-gap="5" y-gap="5" :cols="3">
                  <n-gi v-for="i in shopNextItemList" :key="i" style="display: flex; justify-content: center;">
                    <div class="shop-item">
                      <div class="item-name">汉堡</div>
                      <n-image width="38" class="item-image" src="../assets/image/item/burger.png" preview-disabled />
                      <div class="item-price-wrapper">
                        <span class="price-icon">$</span>
                        <span class="item-price">200</span>
                      </div>
                    </div>
                  </n-gi>
                </n-grid>
              </div>
            </n-carousel>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const shopPageNum = ref(6);
const shopPrevItemList = ref([
  { num: 10 },
  { num: 10 },
  { num: 10 },
  { num: 10 },
  { num: 10 },
  { num: 10 },
]);
const shopNextItemList = ref([{ num: 10 }, { num: 10 }, { num: 10 }]);
const shopPageRef = ref(null);

const prevPage = () => {
  shopPageRef.value?.prev();
};

const nextPage = () => {
  shopPageRef.value?.next();
};
</script>


<style lang="scss" scoped>
.shop-container {
  flex: 1;
  padding: 0 6%;
  background-color: $color-white-200;
  .shop-layout {
    width: 100%;
    height: 100%;
    .shop-head-layout {
      height: 35vh;
      border: 1px solid $border-orange-300;
    }
    .shop-content-layout {
      margin-top: 20px;
    }
  }
}

.shop-head-wrapper {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  .shop-head-title {
    height: 8vh;
    border: 1px solid lightblue;
  }
  .shop-head-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    .money-box {
      display: flex;
      width: 40%;
      align-items: center;
      .money-icon {
        width: 30px;
        height: 30px;
        border: 1px solid $color-white;
        border-radius: 50px;
        background-color: $border-orange-300;
        color: $color-white;
        text-align: center;
        line-height: 28px;
      }
      .money-value {
        width: 100%;
        background-color: $bg-orange-500;
        color: $color-white;
        padding: 3px 0 3px 5px;
      }
    }
    .to-black-market {
      background-color: $border-orange-300;
      padding: 5px 15px;
      color: $color-white;
      border-radius: 5px;
    }
  }
  .shop-head-notice {
    flex: 1;
    border: 1px solid $border-orange-300;
  }
}

.shop-type {
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

.shop-content-wrapper {
  height: 50vh;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  border: 1px solid $border-orange-300;
  background-color: $bg-orange-500;
  position: relative;

  .shop-prev-page-arrow,
  .shop-next-page-arrow {
    position: absolute;
    top: 50%;
    width: 30px;
    height: 30px;
    background-color: rgba(0, 0, 0, 0.5);
    cursor: pointer;
    z-index: 10;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $bg-white-100;
  }

  .shop-prev-page-arrow {
    left: 0;
    transform: translate(-50%, -50%);
  }
  .shop-next-page-arrow {
    right: 0;
    transform: translate(50%, -50%);
  }

  .shop-content-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    select {
      padding: 3px 8px;
      width: 32%;
      font-size: 12px;
    }
    .search-wrapper {
      flex: 1;
      display: flex;
      justify-content: flex-end;
      column-gap: 5px;
      input {
        font-size: 12px;
        padding: 2px 4px;
        width: 65%;
        border: 1px solid $border-orange-300;
      }
      input:focus {
        border: 1px solid $border-orange-300;
      }
      button {
        padding: 1px 10px;
        cursor: pointer;
      }
    }
  }
  .shop-content {
    width: 100%;
    .shop-item {
      width: 95px;
      height: 90px;
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

      .item-image {
        background-color: $bg-white-100;
      }

      .item-name {
        width: 100%;
        font-size: 12px;
        text-align: center;
        color: $bg-white-100;
        border-bottom: 1px solid $bg-white-100;
      }

      .item-price-wrapper {
        width: 100%;
        font-size: 12px;
        display: flex;
        justify-content: center;
        column-gap: 5px;
        border-top: 1px solid $bg-white-100;
      }
    }
  }
}
</style>