import { ref, readonly } from 'vue';

const isMuted = ref<boolean>(false);
let audioElement: HTMLAudioElement | null = null;
let mediaSource: MediaSource | null = null;
let sourceBuffer: SourceBuffer | null = null;
let audioChunkListener: ((event: Event, audio: Buffer) => void) | null = null;
let pendingTimeouts: Set<NodeJS.Timeout> = new Set();

export function useAudio() {

    const initAudioResources = () => {
        // 先清理之前的资源（如果存在）
        clearAudioResources();

        audioElement = new Audio();
        mediaSource = new MediaSource();
        audioElement!.src = URL.createObjectURL(mediaSource!);
        audioElement!.play();
        
        mediaSource.addEventListener('sourceopen', () => {
            console.log('SourceBuffer opened');
            sourceBuffer = mediaSource!.addSourceBuffer('audio/mpeg');

            // 创建新的监听器函数
            audioChunkListener = (_: Event, audio: Buffer) => {
                console.log('Received audio chunk:', audio);
                appendAudioData(audio);
            };

            // 注册监听器
            window.api.onAudioChunk(audioChunkListener);
        });
    };

    const appendAudioData = (audio: Buffer) => {
        // 验证资源状态
        if (!sourceBuffer || !mediaSource || mediaSource.readyState !== 'open') {
            console.warn('Cannot append audio: MediaSource or SourceBuffer not ready');
            return;
        }

        // 检查 SourceBuffer 是否可以接受新数据
        if (!sourceBuffer.updating) {
            try {
                // 将音频数据追加到 sourceBuffer
                sourceBuffer.appendBuffer(audio);
            } catch (err) {
                console.error('Error appending audio buffer:', err);
            }
        } else {
            console.log('SourceBuffer is updating, waiting...');
            // 如果 SourceBuffer 正在更新，稍后再尝试添加数据
            const timeoutId = setTimeout(() => {
                pendingTimeouts.delete(timeoutId);
                appendAudioData(audio);
            }, 150);
            pendingTimeouts.add(timeoutId);
        }
    };

    const clearAudioResources = () => {
        // 清除所有待处理的超时
        pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        pendingTimeouts.clear();

        // 移除音频块监听器
        if (audioChunkListener) {
            window.api.removeAllAudioChunkListeners();
            audioChunkListener = null;
        }

        // 停止音频播放
        if (audioElement && !audioElement.paused) {
            audioElement.pause();
        }
    
        // 清空 SourceBuffer 数据
        if (mediaSource?.readyState === 'open' && sourceBuffer) {
            try {
                // 等待 SourceBuffer 更新完成
                if (!sourceBuffer.updating) {
                    mediaSource.removeSourceBuffer(sourceBuffer);
                } else {
                    // 如果正在更新，等待完成后再移除
                    sourceBuffer.addEventListener('updateend', () => {
                        if (mediaSource?.readyState === 'open' && sourceBuffer) {
                            mediaSource.removeSourceBuffer(sourceBuffer);
                        }
                    }, { once: true });
                }
            } catch (err) {
                console.error('Error removing source buffer:', err);
            }
        }

        // 重置引用
        sourceBuffer = null;
    
        // 释放 MediaSource 和 Audio 元素
        if (mediaSource) {
            try {
                if (mediaSource.readyState === 'open') {
                    mediaSource.endOfStream();
                }
            } catch (err) {
                console.error('Error ending media source stream:', err);
            }
            mediaSource = null;
        }

        if (audioElement) {
            URL.revokeObjectURL(audioElement.src);
            audioElement.src = '';
            audioElement = null;
        }
        
        console.log('Audio resources cleared.');
    };
    

    const changeMuted = (newVal: boolean) => {
        isMuted.value = newVal;
    };

    return {
        // 是否静音
        isMuted: readonly(isMuted),

        initAudioResources,
        clearAudioResources,
        changeMuted,
    }
}
