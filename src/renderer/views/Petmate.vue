<template>
    <div class="petmate-container">
        <div ref="petmateContainer" class="petmate-canvas-container"></div>
        <div v-if="shouldShowHungryDialog" class="pet-dialog hunger-dialog" aria-live="polite">
            <span>{{ hungryDialogVisibleText }}</span>
            <span v-if="isHungryDialogTyping" class="pet-dialog-caret"></span>
        </div>
        <div v-if="shouldShowSleepDialog" class="pet-dialog sleep-dialog" aria-live="polite">
            <span>{{ sleepDialogVisibleText }}</span>
            <span v-if="isSleepDialogTyping" class="pet-dialog-caret"></span>
        </div>
        <div class="context-menu" v-if="isShowContextMenu">
            <WheelMenu @closed="closeContextMenu" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import WheelMenu from '../components/WheelMenu.vue'
import { isShowContextMenu, usePetmateModel } from '../hooks/usePetmateModel'
import { usePlayer } from '../hooks/usePlayer'

const LOW_ATTRIBUTE_RATIO = 0.3
const LOW_ENERGY_RATIO = 0.1
const PLAYER_REFRESH_INTERVAL = 30 * 1000
const HUNGER_DIALOG_TYPE_INTERVAL = 200
const SLEEP_DIALOG_TYPE_INTERVAL = 120
const SLEEP_DIALOG_VISIBLE_MS = 2600

const petmateContainer = ref()
let playerRefreshTimer: ReturnType<typeof setInterval> | null = null
let hungerDialogTimer: ReturnType<typeof setInterval> | null = null
let sleepDialogTimer: ReturnType<typeof setInterval> | null = null
let sleepDialogHideTimer: ReturnType<typeof setTimeout> | null = null
let stopPlayerDataSync: (() => void) | null = null
let hasInitializedAttributeBaseline = false
let lastLowAttributeState = false
const isAngryByAttribute = ref(false)
const hungryDialogVisibleText = ref('')
const sleepDialogVisibleText = ref('')
const { t } = useI18n()
const hungerDialogText = computed(() => t('petmate.hungryDialog'))
const sleepDialogText = computed(() => t('petmate.sleepDialog'))

const { init2D, playIdle, setAngry, setEnergyLow, setActivity, sleepResponseTick, destroy } =
    usePetmateModel(petmateContainer)
const { playerData, initPlayerData, refreshPlayerData, subscribeToPlayerDataSync } = usePlayer()

const currentPetmate = computed(() => playerData.value?.petmates[0])
const activeActivityId = computed(() => {
    const status = currentPetmate.value?.status
    if (!status || status.status === 'idle' || status.status === 'finished') return null
    return status.activity?.id ?? null
})
const shouldShowHungryDialog = computed(() => {
    const attrs = currentPetmate.value?.attrs
    if (!attrs) return false

    return attrs.hungry <= attrs.maxHungry * LOW_ATTRIBUTE_RATIO
})
const isEnergyLow = computed(() => {
    const attrs = currentPetmate.value?.attrs
    if (!attrs) return false

    return attrs.energy < attrs.maxEnergy * LOW_ENERGY_RATIO
})
const isHungryDialogTyping = computed(() => {
    return (
        shouldShowHungryDialog.value &&
        hungryDialogVisibleText.value.length < hungerDialogText.value.length
    )
})
const shouldShowSleepDialog = computed(() => sleepDialogVisibleText.value.length > 0)
const isSleepDialogTyping = computed(() => {
    return sleepDialogVisibleText.value.length < sleepDialogText.value.length
})
const hasLowAttribute = computed(() => {
    const attrs = currentPetmate.value?.attrs
    if (!attrs) return false

    return (
        attrs.hungry < attrs.maxHungry * LOW_ATTRIBUTE_RATIO ||
        attrs.emotion < attrs.maxEmotion * LOW_ATTRIBUTE_RATIO
    )
})

watch(hasLowAttribute, (isLow) => {
    if (!hasInitializedAttributeBaseline) return
    if (isLow === lastLowAttributeState) return

    lastLowAttributeState = isLow
    isAngryByAttribute.value = isLow
    setAngry(isLow)
})

watch(
    isEnergyLow,
    (isLow) => {
        setEnergyLow(isLow)
    },
    { immediate: true }
)

watch(
    activeActivityId,
    (activityId) => {
        setActivity(activityId)
    },
    { immediate: true }
)

watch(
    shouldShowHungryDialog,
    (shouldShow) => {
        if (!shouldShow) {
            clearHungerDialogTimer()
            hungryDialogVisibleText.value = ''
            return
        }

        startHungerDialogTypewriter()
    },
    { immediate: true }
)

watch(sleepResponseTick, () => {
    startSleepDialogTypewriter()
})

onMounted(async () => {
    stopPlayerDataSync = subscribeToPlayerDataSync(() => {
        void refreshPlayerData()
    })
    window.api.onActivityFinished(() => {
        void refreshPlayerData()
    })

    await init2D()
    playIdle()
    await initPlayerData()
    lastLowAttributeState = hasLowAttribute.value
    hasInitializedAttributeBaseline = true
    isAngryByAttribute.value = lastLowAttributeState
    if (lastLowAttributeState) {
        setAngry(true)
    } else {
        playIdle()
    }

    playerRefreshTimer = setInterval(() => {
        refreshPlayerData()
    }, PLAYER_REFRESH_INTERVAL)
})

onUnmounted(() => {
    if (playerRefreshTimer) clearInterval(playerRefreshTimer)
    stopPlayerDataSync?.()
    stopPlayerDataSync = null
    clearHungerDialogTimer()
    clearSleepDialogTimers()
    destroy()
})

function closeContextMenu() {
    isShowContextMenu.value = false
    if (isAngryByAttribute.value) {
        setAngry(true)
        return
    }

    playIdle()
}

function startHungerDialogTypewriter() {
    clearHungerDialogTimer()
    hungryDialogVisibleText.value = ''

    let currentIndex = 0
    hungerDialogTimer = setInterval(() => {
        currentIndex += 1
        hungryDialogVisibleText.value = hungerDialogText.value.slice(0, currentIndex)

        if (currentIndex >= hungerDialogText.value.length) {
            clearHungerDialogTimer()
        }
    }, HUNGER_DIALOG_TYPE_INTERVAL)
}

function clearHungerDialogTimer() {
    if (!hungerDialogTimer) return

    clearInterval(hungerDialogTimer)
    hungerDialogTimer = null
}

function startSleepDialogTypewriter() {
    clearSleepDialogTimers()
    sleepDialogVisibleText.value = ''

    let currentIndex = 0
    sleepDialogTimer = setInterval(() => {
        currentIndex += 1
        sleepDialogVisibleText.value = sleepDialogText.value.slice(0, currentIndex)

        if (currentIndex >= sleepDialogText.value.length) {
            clearSleepDialogTimer()
            sleepDialogHideTimer = setTimeout(() => {
                sleepDialogVisibleText.value = ''
                sleepDialogHideTimer = null
            }, SLEEP_DIALOG_VISIBLE_MS)
        }
    }, SLEEP_DIALOG_TYPE_INTERVAL)
}

function clearSleepDialogTimer() {
    if (!sleepDialogTimer) return

    clearInterval(sleepDialogTimer)
    sleepDialogTimer = null
}

function clearSleepDialogTimers() {
    clearSleepDialogTimer()
    if (!sleepDialogHideTimer) return

    clearTimeout(sleepDialogHideTimer)
    sleepDialogHideTimer = null
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

.pet-dialog {
    position: fixed;
    top: 0;
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
    animation: petDialogPopIn 0.22s ease-out;

    &::after {
        content: '';
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

.sleep-dialog {
    right: 16px;
    left: auto;

    &::after {
        right: auto;
        left: 30px;
    }
}

.pet-dialog-caret {
    display: inline-block;
    width: 1px;
    height: 1em;
    margin-left: 2px;
    background: #7a3f44;
    vertical-align: -2px;
    animation: petDialogCaretBlink 0.8s steps(1) infinite;
}

@keyframes petDialogPopIn {
    from {
        opacity: 0;
        transform: translateY(6px) scale(0.96);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes petDialogCaretBlink {
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
