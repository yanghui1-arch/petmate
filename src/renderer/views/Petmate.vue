<template>
    <div class="petmate-container">
        <div ref="petmateContainer" class="petmate-canvas-container"></div>
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
import { useSettings } from '@/hooks/useSettings';
import { useSnowfall } from 'vue-snowfall'

const LOW_ATTRIBUTE_RATIO = 0.2;
const PLAYER_REFRESH_INTERVAL = 30 * 1000;

const petmateContainer = ref();
const christmasEffect = ref<boolean>(false);
let stopSnow;
let playerRefreshTimer: ReturnType<typeof setInterval> | null = null;
let hasInitializedAttributeBaseline = false;
let lastLowAttributeState = false;
const isAngryByAttribute = ref(false);

const { init2D, playIdle, setAngry, destroy } = usePetmateModel(petmateContainer);
const { playerData, initPlayerData, refreshPlayerData } = usePlayer();

const currentPetmate = computed(() => playerData.value?.petmates[0]);
const hasLowAttribute = computed(() => {
    const attrs = currentPetmate.value?.attrs;
    if (!attrs) return false;

    return attrs.hungry <= attrs.maxHungry * LOW_ATTRIBUTE_RATIO
        || attrs.emotion <= attrs.maxEmotion * LOW_ATTRIBUTE_RATIO
        || attrs.energy <= attrs.maxEnergy * LOW_ATTRIBUTE_RATIO
        || attrs.health <= attrs.maxHealth * LOW_ATTRIBUTE_RATIO;
});

watch(hasLowAttribute, (isLow) => {
    if (!hasInitializedAttributeBaseline) return;
    if (isLow === lastLowAttributeState) return;

    lastLowAttributeState = isLow;
    isAngryByAttribute.value = isLow;
    setAngry(isLow);
});

onMounted(async () => {
    const { settings } = useSettings();
    christmasEffect.value = settings.value!.christmasEffect;

    if (christmasEffect.value === true) {
        const { startSnowflakes, stopSnowflakes } = useSnowfall({
            container: petmateContainer.value
        })
        stopSnow = stopSnowflakes
        startSnowflakes()
    }

    window.api.onChristmasEffect((_, newChristmasEffect) => {
        christmasEffect.value = newChristmasEffect
        if (christmasEffect.value === true) {
            const { startSnowflakes, stopSnowflakes } = useSnowfall({
                container: petmateContainer.value
            })
            stopSnow = stopSnowflakes
            startSnowflakes()
        } else {
            stopSnow?.('all')
        }
    })

    await init2D();
    playIdle();
    await initPlayerData();
    lastLowAttributeState = hasLowAttribute.value;
    hasInitializedAttributeBaseline = true;
    isAngryByAttribute.value = false;
    playIdle();

    playerRefreshTimer = setInterval(() => {
        refreshPlayerData();
    }, PLAYER_REFRESH_INTERVAL);
})

onUnmounted(() => {
    if (playerRefreshTimer) clearInterval(playerRefreshTimer);
    destroy();
    if(stopSnow) stopSnow('all')
});

function closeContextMenu() {
    isShowContextMenu.value = false;
    if (isAngryByAttribute.value) {
        setAngry(true);
        return;
    }

    playIdle();
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

.context-menu {
    position: fixed;
    inset: 0;
    z-index: 1000;
    pointer-events: auto;
}
</style>
