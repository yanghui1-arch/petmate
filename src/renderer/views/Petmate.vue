<template>
    <div class="petmate-container">
        <div ref="threeContainer" class="three-container"></div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { WindowEvent, WindowInfo } from '../types/window';
import { usePetmateModel } from '../hooks/usePetmateModel';
import * as THREE from 'three';
import { screenToWorld, isSitting, worldToScreen, sittingWindowTitle } from '../hooks/usePetmateModel';

const currentOpenedWindows = ref<WindowInfo[]>([]);

const threeContainer = ref<HTMLDivElement>();
const { initPetmateModel } = usePetmateModel(threeContainer);
const screenResolution = ref<{width: number, height: number}>({width: 0, height: 0});

onMounted(async () => {
    
    // ********************** 获取分辨率 **********************
    screenResolution.value = (await window.windowMonitor.getScreenResolution()).data ?? {width: 1920, height: 1080};

    // ********************** 窗口监控 **********************
    const response = await window.windowMonitor.start();
    currentOpenedWindows.value = (await window.windowMonitor.getWindows()).data ?? [];
    console.log("currentOpenedWindows", currentOpenedWindows.value);

    window.windowMonitor.onWindowOpened(async (event, windowEvent) => {
        currentOpenedWindows.value = (await window.windowMonitor.getWindows()).data ?? [];
    })

    window.windowMonitor.onWindowClosed(async (event, windowEvent) => {
        const modelScreenPosition = worldToScreen(getModelPosition(), screenResolution.value.height, screenResolution.value.width)
        
        if (isSitting) {
            // 如果关闭窗口是模型所在的窗口，直接掉下来就行了
            if (sittingWindowTitle === windowEvent.window.title) {
                modelScreenPosition.y = screenResolution.value.height;
                downBottom(modelScreenPosition);
            }
        }
        currentOpenedWindows.value = (await window.windowMonitor.getWindows()).data ?? [];
    })

    window.windowMonitor.onWindowChanged(async (event, windowEvent: WindowEvent) => {
        const modelScreenPosition = worldToScreen(getModelPosition(), screenResolution.value.height, screenResolution.value.width)
        
        if (isSitting) {
            // 如果变动的模型是模型所在的窗口
            if (sittingWindowTitle === windowEvent.window.title) {
                // 首先需要判断的是模型是否还在窗口的宽度上
                if (modelScreenPosition.x >= windowEvent.window.bounds.x 
                && modelScreenPosition.x <= windowEvent.window.bounds.x + windowEvent.window.bounds.width) {
                    // 如果还在，则需要判断模型是否在窗口的上方
                    if (modelScreenPosition.y < windowEvent.window.bounds.y) {
                        downTo({x: modelScreenPosition.x, y: windowEvent.window.bounds.y});
                    }
                    else {
                        walkTo(screenToWorld(windowEvent.window.bounds.x, windowEvent.window.bounds.y, screenResolution.value.height, screenResolution.value.width));
                        downBottom(modelScreenPosition);
                    }
                } 
                // 如果不在，直接掉下来
                else {
                    downBottom(modelScreenPosition);
                }
            }
        }

        currentOpenedWindows.value = (await window.windowMonitor.getWindows()).data ?? [];
    })

    // ********************** 模型加载 **********************
    initPetmateModel();
})

onUnmounted(() => {
    window.windowMonitor.removeWindowListeners();
    window.windowMonitor.stop();
})

const { walkTo, getModelPosition, sitOn } = usePetmateModel(threeContainer);
const y_offset = 20

// 选择走到某个窗口上，并站在上面
function selectWindow(selectedWindow: WindowInfo) {
    let x_rate = Math.random();
    x_rate = x_rate === 0 ? 0.1 : x_rate
    const x_offset = x_rate * selectedWindow.bounds.width;
    const cordinate = {x: selectedWindow.bounds.x + x_offset, y: selectedWindow.bounds.y + y_offset};

    console.log(`模型应该走向的坐标:(${cordinate.x}, ${cordinate.y})`);
    // 边界问题，之后拓展成多屏幕
    // 需要考虑的是模型坐下来以后，会不会超过屏幕的范围
    if (cordinate.x <= 0 || cordinate.x >= screenResolution.value.width || cordinate.y <= 0 || cordinate.y >= screenResolution.value.height) {
        return ;
    }

    const windowPosition = screenToWorld(cordinate.x, cordinate.y, screenResolution.value.height, screenResolution.value.width);
    if (windowPosition) walkTo(windowPosition);
}

/**
 * 坠落到最底下
 * @param modelPosition 模型的位置
 */
async function downBottom(modelPosition: {x: number, y: number}) {
    const targetPosition = screenToWorld(modelPosition.x, screenResolution.value.height, screenResolution.value.height, screenResolution.value.width);
    if (targetPosition) {
        await walkTo(targetPosition, 2);
        sitOn("");
    }
}

/**
 * 坠落到某个位置
 * @param targetPosition 屏幕坐标
 */
function downTo({x, y}: {x: number, y: number}) {
    const targetPosition = screenToWorld(x, y, screenResolution.value.height, screenResolution.value.width);
    if (targetPosition) {
        walkTo(targetPosition, 2);
    }
}

/**
 * 动画的逻辑
 */
const interval = setTimeout(() => {
    console.log("currentOpenedWindows.value", currentOpenedWindows.value[2].title);
    sitOn(currentOpenedWindows.value[2].title);
    selectWindow(currentOpenedWindows.value[2]);
}, 5000);


</script>

<style scoped lang="scss">
.three-container {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.1)
}

.petmate-container {
    width: 100%;
    height: 100%;
}
</style>