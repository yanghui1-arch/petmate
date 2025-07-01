<template>
    <div class="wish-completion-info">
        <!-- 心愿得基本信息 -->
        <div class="wish-completion-basic-info">
            <!--返回按键-->
            <div class="return-button">
                <n-button>
                    <img src="../../assets/image/return.png" style="width: 20px;"/>
                </n-button>
            </div>
            <img src="../../assets/image/wish.png" style="width: 50px; height: 50px;"/>
            <div class="wish-completion-baisc-info-item">
                <div class="wish-name" style="font-size: 16px;">
                    夏日清凉小确幸
                </div>
                <div class="wish-description">
                    <label style="font-size: 13px;">战斗双！</label>
                </div>
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
</template>

<script lang="ts" setup>
import { ref } from 'vue'

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