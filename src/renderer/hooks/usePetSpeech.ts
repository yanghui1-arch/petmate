import { type ComputedRef, onUnmounted, type Ref, watch } from 'vue'

import type { PetSpeechAnchor, PetSpeechLine } from '../../shared/petSpeech'

export function usePetSpeech(
    line: ComputedRef<PetSpeechLine | null>,
    anchor: Readonly<Ref<PetSpeechAnchor>>
) {
    let previous = '',
        sequence = 0,
        id = ''
    const stop = watch(
        [line, anchor],
        ([value, point]) => {
            if (!value) {
                previous = ''
                window.api.updatePetSpeech(null)
                return
            }
            const key = value.key + ':' + value.text
            if (key !== previous) {
                previous = key
                id = 'speech-' + Date.now() + '-' + ++sequence
            }
            window.api.updatePetSpeech({ ...value, id, anchor: { ...point } })
        },
        { immediate: true }
    )
    onUnmounted(() => {
        stop()
        window.api.updatePetSpeech(null)
    })
}
