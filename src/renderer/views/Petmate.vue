<template>
    <div class="petmate-container">
        <div ref="petmateContainer" class="petmate-canvas-container"></div>
        <div
            v-if="shouldShowHungryDialog"
            class="hunger-dialog"
            aria-live="polite"
        >
            <span>{{ hungryDialogVisibleText }}</span>
            <span
                v-if="isHungryDialogTyping"
                class="hunger-dialog-caret"
            ></span>
        </div>
        <div class="context-menu" v-if="isShowContextMenu">
            <WheelMenu @closed="closeContextMenu"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import WheelMenu from '../components/WheelMenu.vue';
import { isShowContextMenu, usePetmateModel } from '../hooks/usePetmateModel';
import { usePlayer } from '../hooks/usePlayer';

const LOW_ATTRIBUTE_RATIO = 0.3;
const PLAYER_REFRESH_INTERVAL = 30 * 1000;
const HUNGER_DIALOG_TEXT = '尤美真的.....真的.....好饿....';
const HUNGER_DIALOG_TYPE_INTERVAL = 200;

const petmateContainer = ref();
let playerRefreshTimer: ReturnType<typeof setInterval> | null = null;
let hungerDialogTimer: ReturnType<typeof setInterval> | null = null;
let hasInitializedAttributeBaseline = false;
let lastLowAttributeState = false;
const isAngryByAttribute = ref(false);
const hungryDialogVisibleText = ref('');

const { init2D, playIdle, setAngry, destroy } = usePetmateModel(petmateContainer);
const { playerData, initPlayerData, refreshPlayerData } = usePlayer();

const currentPetmate = computed(() => playerData.value?.petmates[0]);
const shouldShowHungryDialog = computed(() => {
    const attrs = currentPetmate.value?.attrs;
    if (!attrs) return false;

    return attrs.hungry <= attrs.maxHungry * LOW_ATTRIBUTE_RATIO;
});
const isHungryDialogTyping = computed(() => {
    return shouldShowHungryDialog.value && hungryDialogVisibleText.value.length < HUNGER_DIALOG_TEXT.length;
});
const hasLowAttribute = computed(() => {
    const attrs = currentPetmate.value?.attrs;
    if (!attrs) return false;

    return attrs.hungry < attrs.maxHungry * LOW_ATTRIBUTE_RATIO
        || attrs.emotion < attrs.maxEmotion * LOW_ATTRIBUTE_RATIO;
});

watch(hasLowAttribute, (isLow) => {
    if (!hasInitializedAttributeBaseline) return;
    if (isLow === lastLowAttributeState) return;

    lastLowAttributeState = isLow;
    isAngryByAttribute.value = isLow;
    setAngry(isLow);
});

watch(shouldShowHungryDialog, (shouldShow) => {
    if (!shouldShow) {
        clearHungerDialogTimer();
        hungryDialogVisibleText.value = '';
        return;
    }

    startHungerDialogTypewriter();
}, { immediate: true });

onMounted(async () => {
    await init2D();
    playIdle();
    await initPlayerData();
    lastLowAttributeState = hasLowAttribute.value;
    hasInitializedAttributeBaseline = true;
    isAngryByAttribute.value = lastLowAttributeState;
    if (lastLowAttributeState) {
        setAngry(true);
    } else {
        playIdle();
    }

    playerRefreshTimer = setInterval(() => {
        refreshPlayerData();
    }, PLAYER_REFRESH_INTERVAL);
})

onUnmounted(() => {
    if (playerRefreshTimer) clearInterval(playerRefreshTimer);
    clearHungerDialogTimer();
    destroy();
});

function closeContextMenu() {
    isShowContextMenu.value = false;
    if (isAngryByAttribute.value) {
        setAngry(true);
        return;
    }

    playIdle();
}

function startHungerDialogTypewriter() {
    clearHungerDialogTimer();
    hungryDialogVisibleText.value = '';

    let currentIndex = 0;
    hungerDialogTimer = setInterval(() => {
        currentIndex += 1;
        hungryDialogVisibleText.value = HUNGER_DIALOG_TEXT.slice(0, currentIndex);

        if (currentIndex >= HUNGER_DIALOG_TEXT.length) {
            clearHungerDialogTimer();
        }
    }, HUNGER_DIALOG_TYPE_INTERVAL);
}

function clearHungerDialogTimer() {
    if (!hungerDialogTimer) return;

    clearInterval(hungerDialogTimer);
    hungerDialogTimer = null;
}
</script>

<style lang="scss" scoped>
.petmate-container {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

.petmate-canvas-container {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1;
    overflow: hidden;
}

.hunger-dialog {
    position: fixed;
    top: 0px;
    left: 16px;
    z-index: 20;
    max-width: 190px;
    min-height: 48px;
    padding: 10px 12px;
    border: 1px solid rgba(253, 203, 110, 0.55);
    border-radius: 12px;
    background: rgba(255, 248, 238, 0.94);
    box-shadow: 0 8px 22px rgba(90, 48, 55, 0.22);
    color: #7a3f44;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.6;
    pointer-events: none;
    animation: hungerDialogPopIn 0.22s ease-out;

    &::after {
        content: "";
        position: absolute;
        right: 30px;
        bottom: -8px;
        width: 14px;
        height: 14px;
        border-right: 1px solid rgba(253, 203, 110, 0.55);
        border-bottom: 1px solid rgba(253, 203, 110, 0.55);
        background: rgba(255, 248, 238, 0.94);
        transform: rotate(45deg);
    }
}

.hunger-dialog-caret {
    display: inline-block;
    width: 1px;
    height: 1em;
    margin-left: 2px;
    background: #7a3f44;
    vertical-align: -2px;
    animation: hungerDialogCaretBlink 0.8s steps(1) infinite;
}

@keyframes hungerDialogPopIn {
    from {
        opacity: 0;
        transform: translateY(6px) scale(0.96);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes hungerDialogCaretBlink {
    0%,
    49% {
        opacity: 1;
    }
    50%,
    100% {
        opacity: 0;
    }
}

.context-menu {
    position: fixed;
    inset: 0;
    z-index: 1000;
    pointer-events: auto;
}
</style>
