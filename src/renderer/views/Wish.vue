<template>
    <div id="wish" class="vertical">
        <!-- petmate好感度信息展示 -->
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

        <!-- 完成心愿和正在进行的心愿的总览 -->
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
        
        <!-- 所有的心愿信息，可以查看 -->
        <div class="wish-container dark-white border-view">
            <div class="wish-container-header medium-white">
                <div class="header-label dark-white">
                    <label>{{ petmateName }}的心愿📩</label>
                </div>
            </div>
            <div class="to-do-wishes medium-white wish-item">
                <!-- 正常显示滚动 -->
                <n-infinite-scroll v-if="check===false" style="height: 100%">
                    <div v-for="i in 15" :key="i" class="item" style="height: 33%;">
                        <WishItem @click="check = !check"/>
                    </div>
                </n-infinite-scroll>

                <!-- 查看某个特定心愿情况 -->
                <div v-else class="wish-completion-info">
                    <!-- 心愿得基本信息 -->
                    <div class="wish-completion-basic-info">
                        <!--返回按键-->
                        <div class="return-button">
                            <n-button @click="check = !check">
                                <img src="../../assets/image/return.png" style="width: 20px;"/>
                            </n-button>
                        </div>
                        <img src="../../assets/image/wish.png" style="width: 50px; height: 50px;"/>
                        <!-- 名字+ 描述 -->
                        <div class="wish-completion-baisc-info-item">
                            <div class="wish-name" style="font-size: 16px;">
                                夏日清凉小确幸
                            </div>
                            <div class="wish-description">
                                <label style="font-size: 13px;">战斗双！</label>
                            </div>
                        </div>
                        <div class="wish-completion-end-time">
                            2025/6/7结束
                        </div>
                    </div>

                    <div><label>目前进度</label></div>

                    <!-- 完成心愿得要求和玩家目前的进度 -->
                    <div class="wish-completion-requirements">
                        <div class="wish-completion-requirements-activity wish-completion-requirements-item">
                
                        </div>

                        <div class="wish-completion-requriements-consume-item wish-completion-requirements-item">
                            <div v-for="item in itemProgress">
                                <img :src="item.url" style="width: 20px;"/>
                                {{ item.name }} ({{ item.giveNum }} / {{ item.requirementNum }})
                                <img v-if="item.status === 'completed'" src="../../assets/image/right.png" style="width: 15px;"/>
                                <img v-else src="../../assets/image/wrong.png" style="width: 15px;"/>
                            </div>
                        </div>
                        
                        <div class="wish-completion-requirements-chat wish-completion-requirements-item">
                            123
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import Avator from '../components/Avator.vue'
import WishItem from '../components/wish/WishItem.vue'


const petmateName = "Dass"
const affenctionLevel = ref(1)
const currentAffenctionExp = ref(60)
const nextAffectionExp = "/100"
const check = ref(false)

let itemProgress = ref([
    {
        "id": 1,
        "name": "汉堡",
        "url": "../../assets/image/wish.png",
        "requirementNum": 2,
        "giveNum": 1,
        "status": "noCompleted"
    },
    {
        "id": 1,
        "name": "汉堡",
        "url": "../../assets/image/wish.png",
        "requirementNum": 2,
        "giveNum": 1,
        "status": "completed"
    },
    {
        "id": 1,
        "name": "汉堡",
        "url": "../../assets/image/wish.png",
        "requirementNum": 2,
        "giveNum": 1,
        "status": "noCompleted"
    }
]) 

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

.wish-completion-info {
    display: flex;
    justify-content: center;
    flex-direction: column;
    row-gap: 5px;
    width: 100%;
    height: 100%;
    .wish-completion-basic-info {
        display: flex;
        .wish-completion-baisc-info-item {
            display: flex;
            flex-direction: column;
            column-gap: 5px;
            padding-top: 10px;
        }
        .wish-completion-end-time {
            margin-left: auto;
            margin-top: auto;
        }
    }
    .wish-completion-requirements {
        display: flex;
        column-gap: 5px;
        background-color: $bg-white-300;
        border-radius: 5px;
        justify-content: center;
        height: 100%;
    }
}

.wish-completion-requirements-item {
    background-color: $bg-white-100;
    border-radius: 5px;
    margin: 5px;
    display: flex;
    flex-direction: column;
    row-gap: 5px;
    width: 100%;
    font-size: 10px;
}

label {
    color: $font-gray;
    font-size: 16px;
}

</style>