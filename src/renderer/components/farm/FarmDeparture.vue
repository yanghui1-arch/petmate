<template>
    <div class="farm-departure">
        <div
            class="departure-frame"
            :style="{
                visibility: changing || switched ? 'visible' : 'hidden',
                clipPath: changing
                    ? `inset(0 calc(100% - 245px) ${farmDeparture.windowHeight - scan}px 0)`
                    : 'none'
            }"
        >
            <video
                ref="video"
                class="departure-video"
                :style="style"
                :src="departure"
                preload="auto"
                muted
                playsinline
                aria-hidden="true"
                @loadeddata="ready"
            ></video>
        </div>
        <div v-if="changing" class="costume-effect" aria-hidden="true">
            <div
                class="costume-light"
                :style="{
                    transform: `translateY(${scan}px)`,
                    opacity: Math.min(scan / 24, (farmDeparture.windowHeight - scan) / 24, 1)
                }"
            >
                <i></i>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { farmDeparture } from '../../../shared/farmLife'
import { departure } from '../../assets/farm-life'
const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })
const emit = defineEmits<{ scan: [y: number]; switched: [] }>()
const video = ref<HTMLVideoElement>()
const loaded = ref(false),
    changing = ref(false),
    switched = ref(false),
    scan = ref(0)
let animationFrame: number | undefined
const style = {
    width: farmDeparture.videoWidth + 'px',
    height: farmDeparture.videoHeight + 'px',
    left: farmDeparture.left + 'px',
    top: farmDeparture.top + 'px'
}
function start() {
    if (!props.active || !loaded.value || changing.value || switched.value) return
    changing.value = true
    const started = performance.now()
    function step(now: number) {
        const progress = Math.min(1, Math.max(0, (now - started) / farmDeparture.costumeMs))
        scan.value = progress * farmDeparture.windowHeight
        // Both costumes use this exact boundary in desktop coordinates.
        emit('scan', scan.value)
        if (progress < 1) animationFrame = requestAnimationFrame(step)
        else {
            animationFrame = undefined
            changing.value = false
            switched.value = true
            emit('switched')
            void video.value?.play().catch(() => {})
        }
    }
    animationFrame = requestAnimationFrame(step)
}
function ready() {
    loaded.value = true
    start()
}
watch(() => props.active, start)
onMounted(() => {
    if (video.value && video.value.readyState >= 2) ready()
})
onUnmounted(() => {
    if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
})
</script>
<style scoped>
.farm-departure {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
}
.departure-video {
    position: absolute;
    object-fit: contain;
}
.departure-frame {
    position: absolute;
    inset: 0;
}
.costume-effect {
    position: absolute;
    inset: 0;
}
.costume-light {
    position: absolute;
    left: 34px;
    top: -27px;
    width: 232px;
    height: 54px;
    background: radial-gradient(ellipse, #fff5d9eb 0%, #ffda87b3 35%, #ffd57900 72%);
    will-change: transform;
}
.costume-light i {
    position: absolute;
    top: 25px;
    left: 18px;
    right: 18px;
    height: 4px;
    border-radius: 50%;
    background: linear-gradient(90deg, #fff8df00, #fff8df 25%, #ffffff 50%, #fff8df 75%, #fff8df00);
    box-shadow: 0 0 8px #ffdc87;
}
</style>
