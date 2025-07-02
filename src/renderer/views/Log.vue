<template>
  <div class="log-container">
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
</template>

<style lang="scss" scoped>
.home-log-layout {
  margin-top: 20px;
}
.home-log-nav {
  .home-item-log-wrapper {
    display: flex;
    flex-direction: column;
    row-gap: 10px;
  }
}
</style>