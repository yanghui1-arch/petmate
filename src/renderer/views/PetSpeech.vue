<template>
    <pet-speech-bubble
        v-if="state.message"
        :key="state.message.id"
        :state="state"
        @measured="measure"
    />
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import type { PetSpeechState } from '../../shared/petSpeech'
import PetSpeechBubble from '../components/PetSpeechBubble.vue'
const state = ref<PetSpeechState>({ message: null, side: 'above', tail: 130 })
let stop: (() => void) | undefined
function measure(id: string, height: number) {
    window.api.petSpeechMeasured(id, height)
}
onMounted(async () => {
    stop = window.api.onPetSpeechState((value) => {
        state.value = value
    })
    const result = await window.api.getPetSpeech()
    if (result.code === 200 && result.data) state.value = result.data
})
onUnmounted(() => stop?.())
</script>
