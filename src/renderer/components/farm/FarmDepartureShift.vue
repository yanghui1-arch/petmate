<template>
    <span class="departure-shift" hidden aria-hidden="true"></span>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onUnmounted } from 'vue'

import { farmDeparture } from '../../../shared/farmLife'
const props = defineProps<{ id: string }>()
const emit = defineEmits<{ opacity: [value: number]; covered: []; done: [success: boolean] }>()
let frame: number | undefined
let cancelled = false
function fadeOut() {
    const start = performance.now()
    function step(now: number) {
        if (cancelled) return
        const progress = Math.min(1, Math.max(0, (now - start) / farmDeparture.relocationFadeMs))
        emit('opacity', 1 - progress * progress * (3 - 2 * progress))
        if (progress < 1) frame = requestAnimationFrame(step)
        else {
            frame = undefined
            void covered()
        }
    }
    frame = requestAnimationFrame(step)
}
async function covered() {
    emit('covered')
    await nextTick()
    if (cancelled) return
    // Two frames ensure Chromium paints the hidden model before the native move.
    frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
            void move()
        })
    })
}
async function move() {
    frame = undefined
    if (cancelled) return
    let success = false
    try {
        const result = await window.api.moveCoveredFarmDeparture(props.id)
        success = result.code === 200 && result.data === true
    } catch (error) {
        console.error('出行位置调整失败', error)
    }
    if (cancelled) return
    emit('done', success)
}
onMounted(fadeOut)
onUnmounted(() => {
    cancelled = true
    if (frame !== undefined) cancelAnimationFrame(frame)
})
</script>
