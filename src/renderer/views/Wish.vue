<template>
    <div id="wish" class="wish-container">
        <div class="wish-statics">
            <div class="petmate-affection" style="text-align: center; width: 50%;">
                <div>
                    <img src="../assets/image/petmate.png" width="50%" />
                </div>
                <label style="font-size: 16px;">{{ petmateName }}</label>
                <label>好感 LV. {{ affectionLevel }}</label>
                <div style="width: 50%; margin: 10px auto;">
                    <n-progress
                        type="line"
                        color="#e67e22"
                        rail-color="#f1c40f"
                        :percentage="percentage"
                        indicator-placement="inside"
                        :unit="unit"
                        processing
                    />
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
import { ref } from 'vue'

const petmateName = "黛丝"
const affectionLevel = 2
const percentage = 20
const unit = "/100"

</script>

<style>
.wish-container {
    display: flex;
    flex-direction: column;
}

.wish-statics {
    display: flex;
    width: 100%
}

.next-wish-info {
    flex: 1
}

.wish-list {
    flex: 1
}

.petmate-affection{
    display: flex;
    flex-direction: column;
    width: 50%;
}
</style>