<template>
    <div class="desktop" @pointerdown="interact" @contextmenu.prevent="interact">
        <farm-departure
            v-if="state?.life.visit && ['preparing', 'leaving'].includes(state.life.visit.phase)"
            :key="state.life.visit.id"
            :active="state.life.visit.phase === 'leaving'"
            @scan="costumeScan = $event"
            @switched="costumeChanged = true"
        />
        <div
            v-if="
                state &&
                !['visiting', 'exiting'].includes(state.life.visit?.phase ?? '') &&
                !(state.life.visit?.phase === 'leaving' && costumeChanged)
            "
            class="original-costume"
            :style="{
                clipPath:
                    state.life.visit?.phase === 'leaving' ? `inset(${costumeScan}px 0 0)` : 'none'
            }"
        >
            <img class="actor" :src="original.url" :style="original.style" alt="尤美" />
        </div>
        <div v-if="visible" class="bubble" aria-live="polite">{{ visible }}</div>
    </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import classic from '../../src/renderer/assets/models/youmei/animations/idle/01.png'
import labor from '../../src/renderer/assets/models/youmei/animations/idle/labor-skin/01.png'
import school from '../../src/renderer/assets/models/youmei/animations/idle/school-uniform/01.png'
import FarmDeparture from '../../src/renderer/components/farm/FarmDeparture.vue'
import { farmLifeLine } from '../../src/renderer/utils/farmLifeText'
import { farmLifeConfig } from '../../src/shared/farmLife'
import type { LabState } from './types'
const state = ref<LabState>(),
    line = ref(''),
    visible = ref('')
const costumeChanged = ref(false)
const costumeScan = ref(0)
watch(
    () => [state.value?.life.visit?.id, state.value?.life.visit?.phase],
    (current, previous) => {
        if (current[0] !== previous[0] || current[1] !== 'leaving') {
            costumeChanged.value = false
            costumeScan.value = 0
        }
    }
)
const originals = {
    classic: { url: classic, height: 1536, top: 63, bottom: 1408, center: 548 },
    'labor-skin': { url: labor, height: 1448, top: 59, bottom: 1365, center: 574.5 },
    'school-uniform': { url: school, height: 1536, top: 60, bottom: 1436, center: 542.5 }
}
const original = computed(() => {
    const art = originals[state.value?.skin ?? 'classic'],
        scale = 278 / (art.bottom - art.top)
    return {
        url: art.url,
        style: {
            height: art.height * scale + 'px',
            left: 150 - art.center * scale + 'px',
            top: 288 - art.bottom * scale + 'px'
        }
    }
})
const { t } = useI18n()
let stop: (() => void) | undefined,
    speechStop: (() => void) | undefined,
    timer: ReturnType<typeof setInterval> | undefined,
    hideAt = 0
let departureId: string | null = null
function interact() {
    window.farmLab.interaction()
    line.value = ''
    visible.value = ''
    departureId = null
}
onMounted(async () => {
    stop = window.farmLab.subscribe((value) => (state.value = value))
    speechStop = window.farmLab.speech((value) => {
        line.value = farmLifeLine(value.event, value.stage, t)
        visible.value = ''
        hideAt = 0
        departureId = value.stage === 'start' ? value.event.id : null
    })
    state.value = await window.farmLab.state()
    window.farmLab.ready()
    timer = setInterval(() => {
        if (state.value?.conditions.energy || state.value?.conditions.sleep) {
            line.value = ''
            visible.value = ''
            departureId = null
            return
        }
        if (visible.value.length < line.value.length)
            visible.value = line.value.slice(0, visible.value.length + 1)
        else if (line.value && !hideAt) hideAt = Date.now() + (departureId ? farmLifeConfig.speechHoldMs : 3500)
        else if (hideAt && Date.now() >= hideAt) {
            line.value = ''
            visible.value = ''
            hideAt = 0
            const id = departureId
            departureId = null
            if (id && state.value?.life.visit?.id === id && state.value.life.visit.phase === 'preparing') window.farmLab.finishSpeech(id)
        }
    }, 90)
})
onUnmounted(() => {
    stop?.()
    speechStop?.()
    if (timer) clearInterval(timer)
})
</script>
<style scoped>
.desktop {
    width: 100vw;
    height: 300px;
    position: relative;
    overflow: hidden;
}
.actor {
    position: absolute;
    width: auto;
}
.original-costume {
    position: absolute;
    inset: 0 auto auto 0;
    width: 300px;
    height: 300px;
}
.bubble {
    position: absolute;
    top: 5px;
    left: 24px;
    right: 24px;
    border: 1px solid #bd9f72;
    border-radius: 16px;
    padding: 10px 13px;
    background: #fff6e9f2;
    color: #69452e;
    font:
        14px/1.5 'Microsoft YaHei',
        sans-serif;
    box-shadow: 0 3px 8px #38260d18;
}
.bubble:after {
    content: '';
    position: absolute;
    bottom: -7px;
    left: 130px;
    width: 12px;
    height: 12px;
    transform: rotate(45deg);
    background: #fff6e9;
    border-right: 1px solid #bd9f72;
    border-bottom: 1px solid #bd9f72;
}
</style>
