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
import { sittedWindowTitle } from '../hooks/usePetmateModel';

const threeContainer = ref();
const screenResolution = ref({width: 0, height: 0});
const { init3D, standIdle, walkTo, sit, spyBesideWindow, standFromSit, sitted, modelState, getModelScreenPosition, modelConfig, setSittedWindowTitle } = usePetmateModel(threeContainer);

onMounted(async () => {
    /* 获取分辨率 */
    window.windowMonitor.getScreenResolution().then((res: Response<{width: number, height: number}>) => {
        screenResolution.value = res.code === 200 ? res.data! : {width: 1920, height: 1080};
        init3D(screenResolution.value).then(() => {
            standIdle();
            setSittedWindowTitle("");
        });
    });

    window.windowMonitor.start(1000);
    window.windowMonitor.onWindowOpened(async (event, windowEvent: WindowEvent) => {
        const getWindowsRes = await window.windowMonitor.getWindows();
        if (getWindowsRes.code === 200) {
            allWindows.value = getWindowsRes.data!;
        }
    });

    window.windowMonitor.onWindowClosed(async (event, windowEvent: WindowEvent) => {
        console.log(windowEvent);
        const getWindowsRes = await window.windowMonitor.getWindows();
        if (getWindowsRes.code === 200) {
            allWindows.value = getWindowsRes.data!;
        }
        // 如果关闭的窗口正好是Petmate坐着的窗口，则会直接掉到下面
        if (windowEvent.window.title === sittedWindowTitle) {
            console.log(`关闭了窗口：${windowEvent.window.title}`);
            standFromSit();
            setSittedWindowTitle("");
        }
    });
    
    window.windowMonitor.onWindowChanged(async (event, windowEvent: WindowEvent) => {
        console.log(windowEvent);
        const getWindowsRes = await window.windowMonitor.getWindows();
        if (getWindowsRes.code === 200) {
            allWindows.value = getWindowsRes.data!;
        }
        // 如果变的窗口正好的Petmate坐着的窗口，则需要判断一下Petmate是否还可以继续坐在这个窗口上面，如果不行，则应该站起来
        // 不行的条件是窗口的高度和之前的高度差超过20px || 宽度不对
        if (windowEvent.window.title === sittedWindowTitle) {
            const modelPosition = getModelScreenPosition();
            if (modelPosition.x >= windowEvent.window.bounds.x && modelPosition.x <= windowEvent.window.bounds.x + windowEvent.window.bounds.width 
            && Math.abs(modelPosition.y - windowEvent.window.bounds.y) <= 20) {
                // 继续坐着
            } else {
                standFromSit();
            }
        }
    });

    
    // 获取当前打开的所有窗口的信息
    const initAllWindows = await window.windowMonitor.getWindows();
    if (initAllWindows.code === 200) {
        allWindows.value = initAllWindows.data!;
    }

    /* 动画播放计时器 
    * 5分钟之后选择一个动画
    */
    const animTimer = setInterval(() => {
        selectAnimationAndPlay();
    }, 10 * 1000);

})

onUnmounted(() => {
    window.windowMonitor.stop();
    window.windowMonitor.removeWindowListeners();
});

const allWindows = ref<WindowInfo[]>([]);

const selectAnimationAndPlay = () => {
    const idx = Math.floor(Math.random() * allWindows.value.length);
    const window: WindowInfo = allWindows.value[idx];
    if (window.bounds.y - 200 < 0) return ;
    
    console.log(`选择了窗口：${window.title}`);
    
    // 这个50是裙子身高
    walkTo({x: window.bounds.x + window.bounds.width / 2, y: window.bounds.y + 200}, () => {
        sit();
        setSittedWindowTitle(window.title);
    });
};

</script>

<style lang="scss" scoped>
.three-container {
    width: 100%;
    height: 100%;
}
</style>
