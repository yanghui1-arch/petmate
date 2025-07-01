<template>
    <div id="wish" class="vertical">
        <div class="petmate-affection-overview dark-white border-view">
            <div class="avator">
                <Avator/>
            </div>
            <div class="affection-label-info dark-white vertical">
                <div class="petmate-info"><label>{{ petmateName }}</label></div>
                <div class="petmate-info"><label>好感 LV. {{ affenctionLevel }}</label></div>
                <div class="petmate-info">
                    <n-progress
                        type="line"
                        height="10px"
                        :percentage="currentAffenctionExp"
                        :unit="nextAffectionExp"
                        color="#596275"
                        rail-color="#303952"
                        indicator-placement="inside"
                        processing
                    />
                </div>
            </div>
        </div>
        <div class="wish-completion-overview medium-white border-view">
            <div class="wish-completed light-white dashboard">
                <div class="wish-statics"><label>完成心愿</label></div>
                <div class="wish-statics">
                    <label>
                        <n-number-animation :from="0" :to="1222039" />
                    </label>
                </div>
            </div>
            <div class="wish-to-do light-white dashboard">
                <div class="wish-statics"><label>正在进行</label></div>
                <div class="wish-statics">
                    <label>
                        <n-number-animation :from="0" :to="1222039" />
                    </label>
                </div>
            </div>
        </div>
        <div class="wish-container dark-white border-view">
            <div class="wish-container-header medium-white">
                <div class="header-label dark-white">
                    <label>{{ petmateName }}的心愿📩</label>
                </div>
            </div>
            <div class="to-do-wishes medium-white wish-item">
                <n-infinite-scroll style="height: 100%">
                    <div v-for="i in 15" :key="i" class="item" style="height: 33%;">
                        <WishItem/>
                    </div>
                </n-infinite-scroll>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import Avator from '../components/Avator.vue'
import WishItem from '../components/WishItem.vue'

const petmateName = "Dass"
const affenctionLevel = ref(1)
const currentAffenctionExp = ref(60)
const nextAffectionExp = "/100"

</script>

<style lang="scss" scoped>
#wish {
    background-color: $bg-white-100;
    border-radius: 10px;
    margin: 5px;
    height: 100%;
}

.vertical {
    display: flex;
    flex-direction: column;
}

.border-view {
    margin: 5px;
    border-radius: 10px;
}

.dark-white {
    background-color: $bg-white-300;
}

.medium-white {
    background-color: $bg-white-200;
}

.light-white {
    background-color: $bg-white-100;
}

.petmate-affection-overview {
    display: flex;
    height: 30%;
    padding: 5px;
    align-items: center;
    .affection-label-info {
        width: 40%;
        text-align: center;
        .petmate-info {
            background-color: $bg-white-100;
            border-radius: 10px;
            margin: 2px;
            padding: 5px;
        }
    }
}

.wish-completion-overview {
    display: flex;
    height: 20%;
    .dashboard {
        padding: 5px;
        margin: 10px 20px 10px 20px;
        border-radius: 10px;
        text-align: center;
        width: 40%;
        .wish-statics {
            margin: 5px;
        }
    }
}

.wish-container {
    display: flex;
    height: 50%;
    flex-direction: column;
    border-radius: 10px;
    padding: 10px;
    row-gap: 5px;
    .wish-item {
        padding: 10px;
        width: 100%;
        border-radius: 10px;
        height: 80%;
    }
    .wish-container-header{
        text-align: center;
        border-radius: 10px;
        padding: 5px;
        .header-label {
            border-radius: 10px;
            padding: 5px;
            font-size: 18px;
            width: 100%;
        }
    }
}

.avator {
    width: 50%;
    margin: 10px 0px;
}

label {
    color: $font-gray;
    font-weight: bold;
    padding: 10px;
    margin: 10px;
}

</style>