<template>
    <div
        ref="shell"
        class="speech-shell"
        :class="state.side"
        :style="{ '--tail': state.tail + 'px' }"
    >
        <div class="speech-body" role="status" aria-live="polite">
            <span class="speech-reserve" aria-hidden="true">{{ state.message?.text }}</span>
            <span class="speech-visible">{{ state.message?.visibleText }}</span>
        </div>
        <i class="speech-tail" aria-hidden="true"></i>
    </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { petSpeechLayout, type PetSpeechState } from '../../shared/petSpeech'
const props = defineProps<{ state: PetSpeechState }>()
const emit = defineEmits<{ measured: [id: string, height: number] }>()
const shell = ref<HTMLElement>()
let observer: ResizeObserver | undefined
async function measure() {
    await nextTick()
    if (shell.value && props.state.message)
        emit(
            'measured',
            props.state.message.id,
            Math.ceil(shell.value.getBoundingClientRect().height)
        )
}
watch(() => props.state.message?.id, measure)
onMounted(() => {
    observer = new ResizeObserver(() => {
        void measure()
    })
    if (shell.value) observer.observe(shell.value)
    void measure()
})
onUnmounted(() => observer?.disconnect())
</script>
<style scoped>
.speech-shell {
    position: relative;
    box-sizing: border-box;
    width: v-bind('petSpeechLayout.width + "px"');
    padding: 8px;
    pointer-events: none;
}
.speech-body {
    position: relative;
    box-sizing: border-box;
    min-height: 48px;
    padding: 10px 14px;
    border: 1px solid #dfbd82;
    border-radius: 14px;
    background: #fff8ee;
    color: #7a3f44;
    font:
        600 13px/1.6 'Microsoft YaHei',
        sans-serif;
    overflow-wrap: anywhere;
    box-shadow: 0 3px 7px #593f3426;
}
.speech-reserve {
    visibility: hidden;
}
.speech-visible {
    position: absolute;
    top: 10px;
    left: 14px;
    right: 14px;
}
.speech-tail {
    position: absolute;
    width: 10px;
    height: 10px;
    transform: rotate(45deg);
    background: #fff8ee;
    border: solid #dfbd82;
    border-width: 0 1px 1px 0;
}
.above .speech-tail {
    bottom: 3px;
    left: calc(var(--tail) - 5px);
}
.below .speech-tail {
    top: 3px;
    left: calc(var(--tail) - 5px);
    transform: rotate(225deg);
}
.left .speech-tail {
    right: 3px;
    top: calc(var(--tail) - 5px);
    transform: rotate(-45deg);
}
.right .speech-tail {
    left: 3px;
    top: calc(var(--tail) - 5px);
    transform: rotate(135deg);
}
</style>
