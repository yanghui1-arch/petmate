<template>
    <div class="petmate-container">
        <div ref="threeContainer" class="three-container"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { usePetmateModel } from '../hooks/usePetmateModel';
import { transferScreenToWorld, transferWorldToScreen } from '../hooks/usePetmateModel';
import * as THREE from 'three';
import { Response } from '../../types/response';
import { WindowEvent, WindowInfo } from '../types/window';

const threeContainer = ref();
const screenResolution = ref({width: 0, height: 0});
const { init3D, standIdle, walkTo, sit } = usePetmateModel(threeContainer);

onMounted(() => {
    /* 获取分辨率 */
    window.windowMonitor.getScreenResolution().then((res: Response<{width: number, height: number}>) => {
        screenResolution.value = res.code === 200 ? res.data! : {width: 1920, height: 1080};
        init3D(screenResolution.value).then(() => {
            standIdle();
        });
    });

    window.windowMonitor.start(1000);
    window.windowMonitor.onWindowOpened((event, windowEvent: WindowEvent) => {
        console.log(windowEvent);
        windowEventCount.value++;
    });

    window.windowMonitor.onWindowClosed((event, windowEvent: WindowEvent) => {
        console.log(windowEvent);
        windowEventCount.value++;
    });
    
    window.windowMonitor.onWindowChanged((event, windowEvent: WindowEvent) => {
        console.log(windowEvent);
        windowEventCount.value++;
    });

    /* 动画播放计时器 
    * 5分钟之后也会选择一个动作
    */
    const animTimer = setInterval(() => {
        selectAnimationAndPlay();
    }, 5 * 1000);

})

onUnmounted(() => {
    window.windowMonitor.stop();
    window.windowMonitor.removeWindowListeners();
});

/**
 * 模型的动画选择逻辑
 */
// 动画间隔，窗口事件超过就变动一次
const animThreshold = 20;
const windowEventCount = ref(0);
watch(windowEventCount, (newVal: number) => {
    if (newVal >= animThreshold) {
        selectAnimationAndPlay();
        windowEventCount.value = 0;
    }
});

const selectAnimationAndPlay = () => {
    walkTo({x: 800, y: 200});
};




</script>

<style lang="scss" scoped>
.three-container {
    width: 100%;
    height: 100%;
}
</style>
