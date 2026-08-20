<template>
  <div class="log-container">
    <div class="home-log-layout">
      <div class="home-log-nav">
        <n-tabs type="line" animated>
          <n-tab-pane name="item-log" :tab="t('log.item')">
            <div class="home-item-log-wrapper">
              <div class="home-item-log" v-for="i in 10" :key="i">
                <span class="log-time" style="margin-right: 10px;">12:17:55</span>
                <span class="log-content">{{ t('log.sampleItem') }}</span>
              </div>
            </div>
          </n-tab-pane>
          <n-tab-pane name="activity-log" :tab="t('log.activity')">
            {{ t('log.activity') }}
          </n-tab-pane>
        </n-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

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
