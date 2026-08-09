import { readonly, ref } from 'vue'

interface QueuedAudio {
    chunks: ArrayBuffer[]
    mimeType: string
}

const isMuted = ref(false)
let audioElement: HTMLAudioElement | null = null
let audioObjectUrl: string | null = null
let pendingCompressedChunks: ArrayBuffer[] = []
let playbackQueue: QueuedAudio[] = []
let playing = false
let streamFinished = false
let initialized = false

export function useAudio() {
    const initAudioResources = () => {
        clearAudioResources()
        initialized = true

        window.api.onAudioChunk((_, audio, format = 'mp3') => {
            if (isMuted.value) return
            streamFinished = false
            const source = audio as Uint8Array
            const copy = new Uint8Array(source.byteLength)
            copy.set(source)

            if (format === 'wav') {
                playbackQueue.push({
                    chunks: [copy.buffer],
                    mimeType: 'audio/wav'
                })
                void playNext()
            } else {
                pendingCompressedChunks.push(copy.buffer)
            }
        })

        window.api.onTTSFinished(() => {
            if (pendingCompressedChunks.length > 0) {
                playbackQueue.push({
                    chunks: pendingCompressedChunks,
                    mimeType: 'audio/mpeg'
                })
                pendingCompressedChunks = []
            }
            streamFinished = true
            void playNext()
        })

        window.api.onTTSFailed(() => {
            pendingCompressedChunks = []
            streamFinished = true
            void playNext()
        })
    }

    const playNext = async () => {
        if (playing || isMuted.value) return
        const next = playbackQueue.shift()
        if (!next) {
            if (streamFinished) resetStreamState()
            return
        }

        playing = true
        releaseCurrentPlayer()
        audioObjectUrl = URL.createObjectURL(new Blob(next.chunks, { type: next.mimeType }))
        audioElement = new Audio(audioObjectUrl)

        let settled = false
        const finishCurrent = () => {
            if (settled) return
            settled = true
            releaseCurrentPlayer()
            playing = false
            void playNext()
        }
        audioElement.addEventListener('ended', finishCurrent, { once: true })
        audioElement.addEventListener('error', finishCurrent, { once: true })

        try {
            await audioElement.play()
        } catch (error) {
            console.error('[audio] 播放 TTS 音频失败:', error)
            finishCurrent()
        }
    }

    const releaseCurrentPlayer = () => {
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

    const resetStreamState = () => {
        pendingCompressedChunks = []
        streamFinished = false
    }

    const clearAudioResources = () => {
        if (initialized) {
            window.api.removeAllAudioChunkListeners()
            window.api.removeAllTTSFinishedListeners()
            window.api.removeAllTTSFailedListeners()
            initialized = false
        }
        pendingCompressedChunks = []
        playbackQueue = []
        playing = false
        streamFinished = false
        releaseCurrentPlayer()
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
