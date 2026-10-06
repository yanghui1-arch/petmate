<template>
    <div
        class="petmate-container"
        @pointerdown.capture="lifeInteraction"
        @contextmenu.capture="lifeInteraction"
    >
        <farm-away-card
            v-if="isAway"
            :opening="awayOpening"
            @farm="openAwayPage('/farm')"
            @home="openAwayPage('/home')"
        />
        <div
            ref="petmateContainer"
            class="petmate-canvas-container"
            :style="{
                opacity: shiftOpacity,
                display:
                    shiftCovered || (life.visit &&
                    !['preparing', 'returning'].includes(life.visit.phase) &&
                    !(life.visit.phase === 'leaving' && !costumeChanged))
                        ? 'none'
                        : 'block',
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
        <farm-departure-shift v-if="shiftId" :key="shiftId" :id="shiftId"
            @opacity="shiftOpacity = $event" @covered="shiftCovered = true"
            @done="finishShift(shiftId, $event)" />
        <div class="context-menu" v-if="!isAway && isShowContextMenu">
            <wheel-menu @closed="closeContextMenu" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { farmAssistantEnabled, farmExperience } from '../../shared/farmExperience'
import { farmLifeConfig, type FarmLifeView } from '../../shared/farmLife'
import { selectPetSpeech } from '../../shared/petSpeech'
import FarmAwayCard from '../components/farm/FarmAwayCard.vue'
import FarmDeparture from '../components/farm/FarmDeparture.vue'
import FarmDepartureShift from '../components/farm/FarmDepartureShift.vue'
import WheelMenu from '../components/WheelMenu.vue'
import { isShowContextMenu, usePetmateModel } from '../hooks/usePetmateModel'
import { usePlayer } from '../hooks/usePlayer'
import { usePetSpeech } from '../hooks/usePetSpeech'
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

const { init2D, playIdle, setAngry, setEnergyLow, setActivity, sleepResponseTick, speechAnchor, destroy } =
    usePetmateModel(petmateContainer)
const { playerData, initPlayerData, refreshPlayerData, subscribeToPlayerDataSync } = usePlayer()
const life = ref<FarmLifeView>({ visit: null, enabled: false })
const isAway = computed(() => !!life.value.visit && ['visiting', 'exiting'].includes(life.value.visit.phase))
const awayOpening = ref(false)
async function openAwayPage(route: '/farm' | '/home') {
    if (awayOpening.value) return
    awayOpening.value = true
    try {
        const result = await window.api.openNewWindow(route)
        if (result.code !== 200) console.error(result.message)
    } catch (error) {
        console.error('打开出行入口失败', error)
    } finally {
        awayOpening.value = false
    }
}
const costumeChanged = ref(false)
const costumeScan = ref(0)
const shiftId = ref<string | null>(null)
const shiftCovered = ref(false)
const shiftOpacity = ref(1)
function finishShift(id: string, success: boolean) {
    if (shiftId.value !== id) return
    shiftId.value = null
    if (life.value.visit?.id !== id || life.value.visit.phase !== 'preparing') return
    if (success) window.api.finishFarmLifeSpeech(id)
    else {
        shiftCovered.value = false
        shiftOpacity.value = 1
        window.api.farmLifeInteraction()
    }
}
watch(
    () => [life.value.visit?.id, life.value.visit?.phase],
    (current, previous) => {
        if (current[0] !== previous[0] || !['preparing', 'leaving'].includes(current[1] ?? '')) {
            shiftId.value = null
            shiftCovered.value = false
            shiftOpacity.value = 1
        } else if (current[1] !== 'preparing') {
            shiftId.value = null
        }
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
    stopShift: (() => void) | undefined,
    stopLifeSpeech: (() => void) | undefined,
    lifeTimer: ReturnType<typeof setInterval> | undefined,
    lifeHoldUntil = 0,
    lifeTicks = 0
let lifeDepartureId: string | null = null
function lifeInteraction() {
    if (isAway.value) return
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
const speechWindowVisible = ref(!document.hidden)
function updateSpeechVisibility() { speechWindowVisible.value = !document.hidden }
const activeSpeech = computed(() => {
    if (!lifePetReady.value || !speechWindowVisible.value || isAway.value ||
        life.value.visit?.phase === 'leaving' || isShowContextMenu.value) return null
    return selectPetSpeech([
        shouldShowSleepDialog.value ? { key: 'sleep', text: sleepDialogText.value, visibleText: sleepDialogVisibleText.value } : null,
        shouldShowHungryDialog.value ? { key: 'hungry', text: hungerDialogText.value, visibleText: hungryDialogVisibleText.value } : null,
        lifeSpeech.value && !lifeBlocked.value ? { key: 'life', text: lifeSpeech.value, visibleText: lifeVisibleText.value } : null,
        farmSpeech.value && !farmSpeechBlocked.value ? { key: 'assistant', text: farmSpeech.value, visibleText: farmSpeechVisible.value } : null
    ])
})
usePetSpeech(activeSpeech, speechAnchor)
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
    document.addEventListener('visibilitychange', updateSpeechVisibility)
    stopShift = window.api.onFarmDepartureShift?.(({ id }) => {
        if (life.value.visit?.id === id && life.value.visit.phase === 'preparing') shiftId.value = id
    })
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
    document.removeEventListener('visibilitychange', updateSpeechVisibility)
    stopShift?.()
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

.context-menu {
    position: fixed;
    inset: 0;
    z-index: 1000;
    pointer-events: auto;
}
</style>
