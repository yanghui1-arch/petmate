<template>
    <div class="petmate-container">
        <div ref="threeContainer" class="three-container"></div>
        <div class="context-menu" v-if="isShowContextMenu">
            <WheelMenu @closed="isShowContextMenu = false"/>
        </div>
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
import { ScreenPosition } from '../types/model';
import WheelMenu from '../components/WheelMenu.vue';
import { isShowContextMenu } from '../hooks/usePetmateModel';

const threeContainer = ref();

const screenResolution = ref({width: 0, height: 0});
const scaleFator = ref<number>(1);
const { init3D, standIdle, walkTo, sit, spyBesideWindow, standFromSit, sitted, modelState, getModelScreenPosition, modelConfig, setSittedWindowTitle, setModelPosition } = usePetmateModel(threeContainer);


onMounted(async () => {

    /* 获取分辨率并加载模型 */
    window.windowMonitor.getScreenResolution().then((res: Response<{width: number, height: number, scaleFactor: number}>) => {
        screenResolution.value = res.code === 200 ? res.data! : {width: 1920, height: 1080};
        scaleFator.value = res.code === 200 ? res.data!.scaleFactor : 1;
        init3D(screenResolution.value, scaleFator.value).then(() => {
            standIdle();
            setSittedWindowTitle("");
        });
    });
    
    /* 监听是否右键打开菜单 */
    

    /* 监听窗口 */
    window.windowMonitor.start(100);
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
        // 如果变的窗口正好的Petmate坐着的窗口，需要判断这个窗口是否还是激活状态
        // 如果不是激活状态的话，模型就应该起来了
        if (windowEvent.window.title === sittedWindowTitle) {
            const windowPosition: THREE.Vector3 = transferScreenToWorld(
                {x: windowEvent.window.bounds.x + windowEvent.window.bounds.width / 2, y: windowEvent.window.bounds.y}, 
                window.innerWidth, 
                window.innerHeight
            );
            setModelPosition(windowPosition);
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

/**
 * 主动选择的一些动作
 * walkToMiddleBottomAndSit: 走到屏幕中间最下面然后坐下
 * selectOneWindowAndSit: 选择一个窗口然后坐下
 * spyBesideWindow: 在窗口旁边偷看
 * spyBesides: 在屏幕最边上偷看
 */
const animSelections: Map<string, () => void> = new Map([
    // ["walkToBottomAndSit", walkToBottomAndSit],
    ["selectOneWindowAndSit", selectOneWindowAndSit],
    // ["spyBesides", spyBesides]
]);

function walkToBottomAndSit() {
    // targetX [screenResolution.value.width / 3, 2/3 * screenResolution.value.width]
    const targetX = Math.floor(Math.random() * (screenResolution.value.width / 3)) + screenResolution.value.width / 3;
    const targetY = screenResolution.value.height - 100;
    walkTo({x: targetX, y: targetY}, () => {
        sit();
    });
}

/**
 * 选择一个窗口，坐在这个窗口上
 */
function selectOneWindowAndSit() {
    // 1. 先选择一个可以坐着的窗口
    const idx = Math.floor(Math.random() * allWindows.value.length);
    const window: WindowInfo = allWindows.value[idx];
    // 人物坐上去会超过窗口之外
    if (window.bounds.y - 150 < 0) return ;
    console.log(`选择了窗口：${window.title}`);

    // 2. 走到窗口旁边
    walkTo({x: window.bounds.x + window.bounds.width / 2, y: window.bounds.y}, () => {
        sit();
        setSittedWindowTitle(window.title);
    });
}

/**
 * 走到屏幕最右边，然后随机选择一个下半区，偷看
 * 这个目前还不行，因为偷看的动作需要优化
 */
function spyBesides() {
    const targetX = screenResolution.value.width;
    // 随机的下半区, 越大越在下半区
    const targetY = Math.floor(Math.random() * (screenResolution.value.height / 2)) + screenResolution.value.height / 2;
    walkTo({x: targetX, y: targetY}, () => {
        spyBesideWindow();
    });
}

// 随机选择一个主动播放动画播放
const selectAnimationAndPlay = () => {
    // 随机从animSelections里选一个主动播放
    const animSelection = Array.from(animSelections.keys())[Math.floor(Math.random() * animSelections.size)];
    const animSelectionFunc = animSelections.get(animSelection);
    if (animSelectionFunc) {
        animSelectionFunc();
    }
};

</script>

<style lang="scss" scoped>
.three-container {
    width: 100%;
    height: 100%;
    z-index: 1
}

.context-menu {
    z-index: 1000; /* 确保在canvas之上 */
    pointer-events: auto; /* 确保可以接收鼠标事件 */
    height: 100px;
}

</style>
