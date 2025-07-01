<template>
  <div id="wish" class="vertical">
    <!-- petmate好感度信息展示 -->
    <div class="petmate-affection-overview dark-white border-view">
      <div class="avator">
        <Avator />
      </div>
      <div class="affection-label-info dark-white vertical">
        <div class="petmate-info"><label>{{ petmateName }}</label></div>
        <div class="petmate-info"><label>好感 LV. {{ affenctionLevel }}</label></div>
        <div class="petmate-info">
          <n-progress type="line" height="10px" :percentage="currentAffenctionExp" :unit="nextAffectionExp" color="#596275" rail-color="#303952" indicator-placement="inside" processing />
        </div>
      </div>
    </div>

    <div class="wish-completion" style="width: 50%; text-align: center;">

      <n-row>
        <n-col :span="12" style="text-align: center;">
          <n-statistic label="完成心愿" tabular-nums>
            <n-number-animation ref="numberAnimationInstRef" :from="0" :to="222" />

          </n-statistic>
        </n-col>
        <n-col :span="12" style="text-align: center;">
          <n-statistic label="剩余心愿" tabular-nums>
            <n-number-animation ref="numberAnimationInstRef" :from="0" :to="1222" />
          </n-statistic>
        </n-col>
      </n-row>
    </div>
  </div>

  <div class="next-wish-info">

  </div>

  <div class="wish-list">

  </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const petmateName = "黛丝";
const affectionLevel = 2;
const percentage = 20;
const unit = "/100";
</script>

<style>
.wish-container {
  display: flex;
  flex-direction: column;
}

.wish-statics {
  display: flex;
  width: 100%;
}

.next-wish-info {
  flex: 1;
}

.wish-list {
  flex: 1;
}

.petmate-affection {
  display: flex;
  flex-direction: column;
  width: 50%;
}
</style>