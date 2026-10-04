<template>
    <div
        class="petmate-container"
        @pointerdown.capture="lifeInteraction"
        @contextmenu.capture="lifeInteraction"
    >
        <div
            ref="petmateContainer"
            class="petmate-canvas-container"
            :style="{
                visibility:
                    life.visit &&
                    !['preparing', 'returning'].includes(life.visit.phase) &&
                    !(life.visit.phase === 'leaving' && !costumeChanged)
                        ? 'hidden'
                        : 'visible',
                clipPath: life.visit?.phase === 'leaving' ? `inset(${costumeScan}px 0 0)` : 'none'
            }"
        ></div>
        <farm-departure
            v-if="life.visit && ['preparing', 'leaving'].includes(life.visit.phase)"
            :key="life.visit.id"
            :active="life.visit.phase === 'leaving'"
            @scan="costumeScan = $event"
            @switched="costumeChanged = true"
        />
        <div v-if="lifeSpeech && !lifeBlocked" class="pet-dialog farm-dialog" aria-live="polite">
            <span>{{ lifeVisibleText }}</span
            ><span
                v-if="lifeVisibleText.length < lifeSpeech.length"
                class="pet-dialog-caret"
            ></span>
        </div>
        <div v-if="shouldShowHungryDialog" class="pet-dialog hunger-dialog" aria-live="polite">
            <span>{{ hungryDialogVisibleText }}</span>
            <span v-if="isHungryDialogTyping" class="pet-dialog-caret"></span>
        </div>
        <div v-if="shouldShowSleepDialog" class="pet-dialog sleep-dialog" aria-live="polite">
            <span>{{ sleepDialogVisibleText }}</span>
            <span v-if="isSleepDialogTyping" class="pet-dialog-caret"></span>
        </div>
        <div class="context-menu" v-if="isShowContextMenu">
            <wheel-menu @closed="closeContextMenu" />
        </div>
        <div
            v-if="farmSpeech && !farmSpeechBlocked"
            class="pet-dialog farm-dialog"
            aria-live="polite"
        >
            <span>{{ farmSpeechVisible }}</span
            ><span
                v-if="farmSpeechVisible.length < farmSpeech.length"
                class="pet-dialog-caret"
            ></span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { farmAssistantEnabled, farmExperience } from '../../shared/farmExperience'
import { farmLifeConfig, type FarmLifeView } from '../../shared/farmLife'
import FarmDeparture from '../components/farm/FarmDeparture.vue'
import WheelMenu from '../components/WheelMenu.vue'
import { isShowContextMenu, usePetmateModel } from '../hooks/usePetmateModel'
import { usePlayer } from '../hooks/usePlayer'
import { FarmDialogue } from '../utils/farmDialogue'
import { farmLifeLine } from '../utils/farmLifeText'

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
const life = ref<FarmLifeView>({ visit: null, enabled: false })
const costumeChanged = ref(false)
const costumeScan = ref(0)
watch(
    () => [life.value.visit?.id, life.value.visit?.phase],
    (current, previous) => {
        if (current[0] !== previous[0] || current[1] !== 'leaving') {
            costumeChanged.value = false
            costumeScan.value = 0
        }
    }
)
const lifePetReady = ref(false)
const lifeSpeech = ref(''),
    lifeVisibleText = ref('')
const lifeBlocked = computed(
    () =>
        shouldShowHungryDialog.value ||
        shouldShowSleepDialog.value ||
        isShowContextMenu.value ||
        isEnergyLow.value ||
        !!activeActivityId.value
)
let stopLife: (() => void) | undefined,
    stopLifeSpeech: (() => void) | undefined,
    lifeTimer: ReturnType<typeof setInterval> | undefined,
    lifeHoldUntil = 0,
    lifeTicks = 0
let lifeDepartureId: string | null = null
function lifeInteraction() {
    window.api.farmLifeInteraction?.()
    lifeSpeech.value = ''
    lifeVisibleText.value = ''
    lifeDepartureId = null
}

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
const farmSpeech = ref(''),
    farmSpeechVisible = ref('')
const farmDialogue = new FarmDialogue()
const farmSpeechBlocked = computed(() => {
    const status = currentPetmate.value?.status.status
    return (
        !farmAssistantEnabled ||
        shouldShowHungryDialog.value ||
        shouldShowSleepDialog.value ||
        isShowContextMenu.value ||
        (!!status && status !== 'idle' && status !== 'finished') ||
        isEnergyLow.value
    )
})
let farmSpeechTimer: ReturnType<typeof setInterval> | undefined,
    stopFarmSpeech: (() => void) | undefined,
    speechHoldUntil = 0
function clearFarmSpeech() {
    farmSpeech.value = ''
    farmSpeechVisible.value = ''
    speechHoldUntil = 0
    farmDialogue.clear()
}
function advanceFarmSpeech() {
    if (farmSpeechBlocked.value || document.hidden) {
        clearFarmSpeech()
        return
    }
    const now = Date.now(),
        event = farmDialogue.next(now, false)
    if (event) {
        farmSpeech.value = t('petmate.farmSpeech.' + event)
        farmSpeechVisible.value = ''
        speechHoldUntil = 0
    }
    if (!farmSpeech.value) return
    if (farmSpeechVisible.value.length < farmSpeech.value.length)
        farmSpeechVisible.value = farmSpeech.value.slice(0, farmSpeechVisible.value.length + 1)
    else if (!speechHoldUntil) speechHoldUntil = now + farmExperience.bubbleHoldMs
    else if (now >= speechHoldUntil) {
        farmSpeech.value = ''
        farmSpeechVisible.value = ''
        speechHoldUntil = 0
    }
}
watch(farmSpeechBlocked, (value) => {
    if (value) clearFarmSpeech()
})
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
    stopLife = window.api.onFarmLifeState?.((state) => {
        life.value = state
        if (state.visit?.phase !== 'preparing' || state.visit.id !== lifeDepartureId) lifeDepartureId = null
        if (!state.visit) {
            lifeSpeech.value = ''
            lifeVisibleText.value = ''
        }
    })
    stopLifeSpeech = window.api.onFarmLifeSpeech?.((speech) => {
        if (!life.value.enabled || lifeBlocked.value || document.hidden) return
        lifeSpeech.value = farmLifeLine(speech.event, speech.stage, t)
        lifeVisibleText.value = ''
        lifeHoldUntil = 0
        lifeDepartureId = speech.stage === 'start' ? speech.event.id : null
    })
    void window.api.getFarmLife?.().then((result) => {
        if (result.code === 200 && result.data) life.value = result.data
    })
    lifeTimer = setInterval(() => {
        if (++lifeTicks % 20 === 0)
            window.api.farmLifePetState?.(
                lifePetReady.value && !!playerData.value,
                lifeBlocked.value
            )
        if (lifeBlocked.value || document.hidden) {
            lifeSpeech.value = ''
            lifeVisibleText.value = ''
            lifeDepartureId = null
            return
        }
        if (!lifeSpeech.value) return
        if (lifeVisibleText.value.length < lifeSpeech.value.length)
            lifeVisibleText.value = lifeSpeech.value.slice(0, lifeVisibleText.value.length + 1)
        else if (!lifeHoldUntil) lifeHoldUntil = Date.now() + (lifeDepartureId ? farmLifeConfig.speechHoldMs : 3_000)
        else if (Date.now() >= lifeHoldUntil) {
            lifeSpeech.value = ''
            lifeVisibleText.value = ''
            const id = lifeDepartureId
            lifeDepartureId = null
            if (id && life.value.visit?.id === id && life.value.visit.phase === 'preparing') window.api.finishFarmLifeSpeech?.(id)
        }
    }, 80)
    if (farmAssistantEnabled) {
        stopFarmSpeech = window.api.onFarmAssistantEvent?.((event) => {
            if (!document.hidden && !farmSpeechBlocked.value) farmDialogue.offer(event)
        })
        farmSpeechTimer = setInterval(advanceFarmSpeech, 120)
        document.addEventListener('visibilitychange', clearFarmSpeech)
    }
    stopPlayerDataSync = subscribeToPlayerDataSync(() => {
        void refreshPlayerData()
    })
    window.api.onActivityFinished(() => {
        void refreshPlayerData()
    })

    await init2D()
    playIdle()
    await initPlayerData()
    lifePetReady.value = true
    window.api.farmLifePetState?.(!!playerData.value, lifeBlocked.value)
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

watch(lifeBlocked, (blocked) => {
    window.api.farmLifePetState?.(lifePetReady.value && !!playerData.value, blocked)
    if (blocked) {
        lifeSpeech.value = ''
        lifeVisibleText.value = ''
    }
})

onUnmounted(() => {
    stopLife?.()
    stopLifeSpeech?.()
    if (lifeTimer) clearInterval(lifeTimer)
    window.api.farmLifePetState?.(false, true)
    stopFarmSpeech?.()
    if (farmSpeechTimer) clearInterval(farmSpeechTimer)
    document.removeEventListener('visibilitychange', clearFarmSpeech)
    clearFarmSpeech()
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
