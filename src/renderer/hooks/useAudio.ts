import { readonly, ref } from 'vue'

const isMuted = ref(false)
let audioElement: HTMLAudioElement | null = null
let audioObjectUrl: string | null = null
let audioChunks: ArrayBuffer[] = []
let audioFormat = 'mp3'
let initialized = false

export function useAudio() {
    const initAudioResources = () => {
        clearAudioResources()
        initialized = true

        window.api.onAudioChunk((_, audio, format = 'mp3') => {
            if (isMuted.value) return
            audioFormat = format
            const source = audio as Uint8Array
            const copy = new Uint8Array(source.byteLength)
            copy.set(source)
            audioChunks.push(copy.buffer)
        })

        window.api.onTTSFinished(() => {
            if (isMuted.value || audioChunks.length === 0) {
                resetPendingAudio()
                return
            }
            void playPendingAudio()
        })

        window.api.onTTSFailed(() => {
            resetPendingAudio()
        })
    }

    const playPendingAudio = async () => {
        const chunks = audioChunks
        const format = audioFormat
        resetPendingAudio()

        if (audioElement) {
            audioElement.pause()
            audioElement.src = ''
        }
        if (audioObjectUrl) {
            URL.revokeObjectURL(audioObjectUrl)
            audioObjectUrl = null
        }

        const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg'
        audioObjectUrl = URL.createObjectURL(new Blob(chunks, { type: mimeType }))
        audioElement = new Audio(audioObjectUrl)
        audioElement.addEventListener('ended', releasePlayer, { once: true })

        try {
            await audioElement.play()
        } catch (error) {
            console.error('[audio] 播放 TTS 音频失败:', error)
            releasePlayer()
        }
    }

    const resetPendingAudio = () => {
        audioChunks = []
        audioFormat = 'mp3'
    }

    const releasePlayer = () => {
        if (audioElement) {
            audioElement.pause()
            audioElement.src = ''
            audioElement = null
        }
        if (audioObjectUrl) {
            URL.revokeObjectURL(audioObjectUrl)
            audioObjectUrl = null
        }
    }

    const clearAudioResources = () => {
        if (initialized) {
            window.api.removeAllAudioChunkListeners()
            window.api.removeAllTTSFinishedListeners()
            window.api.removeAllTTSFailedListeners()
            initialized = false
        }
        resetPendingAudio()
        releasePlayer()
    }

    const changeMuted = (newValue: boolean) => {
        isMuted.value = newValue
    }

    return {
        isMuted: readonly(isMuted),
        initAudioResources,
        clearAudioResources,
        changeMuted
    }
}
