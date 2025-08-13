<template>
    <n-spin :show="showSpin" stroke="#fb7b87" class="spin-container">
        <div class="data-recovery-container">
            <div class="recover-btn-wrapper">
                <button class="recover-btn" @click="handleRecoverData">点击恢复数据</button>
            </div>
            <div class="recover-doc-wrapper">
                <div class="recover-doc-title">
                    说明
                </div>
                <div class="recover-doc-content">
                    <p>内容：2021年7月27日 — 3D Emoji图标是一套包含了独立图形元素的资源集合，这些元素以3D的形式展现了各式各样的emoji表情，丰富了网络交流和视觉传达的方式。由于数量庞大，这 .</p>
                </div>
            </div>
        </div>
        <template #description>
            <div class="recover-tip">
                正在恢复数据，请不要离开...
            </div>
        </template>
    </n-spin>
</template>

<script setup lang="ts">
import { openMessageModal } from '../hooks/useInteract';
import { ref } from 'vue';
const showSpin = ref(false);
const handleRecoverData = () => {
    console.log('恢复数据');
    showSpin.value = true;
    setTimeout(() => {
        showSpin.value = false;
        openMessageModal('success', '恢复数据成功，现在继续愉快地玩耍吧~');
        // 有错误调这个
        // openMessageModal('fail', '恢复数据失败，请稍后再试~');
    }, 3000);
    
};
</script>

<style scoped lang="scss">
.spin-container {
    flex: 1;
    background: $system-bgc;
    padding: 0 6%;
}
.data-recovery-container {
    .recover-btn-wrapper {
        margin-top: 40px;
    }
    .recover-doc-wrapper {
        margin-top: 20px;
    }
}
.recover-btn-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    .recover-btn {
        border: 1px solid $color-white;
        padding: 8px 20px;
        border-radius: 3px;
        background: linear-gradient(
          135deg,
          $btn-grad-start 0%,
          $btn-grad-end 100%
        );
        box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.4),
          0 5px 15px rgba(0, 0, 0, 0.2);
        color: $accent-brown;
        transition: transform 0.3s ease;
        &:hover {
            transform: translateY(-2px);
        }
        &:active {
            transform: translateY(0);
        }
    }
}

.recover-doc-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    row-gap: 10px;
    .recover-doc-title {
        font-size: 24px;
        color: $font-light;
    }
    .recover-doc-content {
        font-size: 14px;
        color: $font-light;
        p {
            text-indent: 2em;
        }
    }
}
.recover-tip {
    width: 100%;
    font-size: 14px;
    color: #fff;
}
.n-spin-container .n-spin-body {
    width: 100% !important;
}
</style>