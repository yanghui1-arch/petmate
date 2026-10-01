<template>
    <div ref="host" class="farm-scene" @pointerleave="scene?.leave()" @contextmenu.prevent>
        <div v-if="error" class="scene-error" role="alert">
            {{ t('farm.sceneFailed') }} {{ error }}
            <button @click="start">{{ t('farm.retry') }}</button>
        </div>
        <div v-else-if="!ready" class="scene-error">{{ t('farm.loading') }}</div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { FarmScene, FarmSceneState } from '../../game/FarmScene'
import type { FarmHover, FarmTarget } from '../../game/farmSceneModel'

const props = defineProps<{ state: FarmSceneState }>()
const emit = defineEmits<{
    target: [target: FarmTarget, right: boolean]
    hover: [hover: FarmHover]
    progress: [progress: number]
    ready: []
    error: [message: string]
}>()
const { t } = useI18n()
const host = ref<HTMLElement | null>(null)
const error = ref('')
const ready = ref(false)
let scene: FarmScene | null = null
let game: import('phaser').Game | null = null
let observer: ResizeObserver | null = null
let generation = 0
let disposed = false
async function start() {
    const token = ++generation
    game?.destroy(true)
    game = null
    scene = null
    ready.value = false
    error.value = ''
    emit('progress', 0)
    try {
        const { createFarmGame } = await import('../../game/FarmScene')
        if (disposed || token !== generation || !host.value) return
        const created = createFarmGame(host.value, props.state, {
            target: (target, right) => { if (!disposed && token === generation) emit('target', target, right) },
            hover: (hover) => { if (!disposed && token === generation) emit('hover', hover) },
            ready: () => {
                if (disposed || token !== generation || error.value) return
                ready.value = true
                emit('ready')
            },
            progress: (value) => { if (!disposed && token === generation) emit('progress', value) },
            error: (message) => {
                if (disposed || token !== generation) return
                error.value = message
                emit('error', message)
            }
        })
        game = created.game
        scene = created.scene
    } catch (reason) {
        if (!disposed && token === generation)
            error.value = reason instanceof Error ? reason.message : String(reason)
        if (!disposed && token === generation) emit('error', error.value)
    }
}
watch(
    () => props.state,
    (state) => scene?.updateState(state)
)
onMounted(() => {
    observer = new ResizeObserver(() => {
        if (host.value && game?.isBooted)
            game.scale.resize(host.value.clientWidth, host.value.clientHeight)
    })
    if (host.value) observer.observe(host.value)
    void start()
})
onUnmounted(() => {
    disposed = true
    generation++
    observer?.disconnect()
    game?.destroy(true)
    scene = null
    game = null
})
</script>
<style scoped>
.farm-scene {
    position: absolute;
    inset: 0;
}
.farm-scene :deep(canvas) {
    display: block;
}
.scene-error {
    position: absolute;
    z-index: 4;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e7dfc3;
    gap: 8px;
}
</style>
