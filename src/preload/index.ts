import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { ChatLLMConfig, ChatMessage, TTSLLMConfig, TTSVoice } from '../main/llm'
import { SettingConfig } from '../main/settings'
import { ActivityInfo } from '../main/types/activity'
import { ItemType } from '../main/types/item'
import type { PlayerResourceState } from '../main/types/player-resource'
import { WindowEvent } from '../main/window-monitor'
import { LocalAIStatus } from '../main/local-ai'

/**
 * API 调用接口
 */
contextBridge.exposeInMainWorld('api', {
    // init
    initSettings: () => ipcRenderer.invoke('init-settings'),
    initLLM: () => ipcRenderer.invoke('init-llm'),

    // get && show
    getCurrentPlayerData: () => ipcRenderer.invoke('get-current-player-data'),
    getChatLLMConfig: () => ipcRenderer.invoke('get-chat-llm-config'),
    getTTSLLMConfig: () => ipcRenderer.invoke('get-tts-config'),
    showActivities: (type: ActivityInfo['type']) => ipcRenderer.invoke('show-activities', type),
    showItems: (type: ItemType) => ipcRenderer.invoke('show-items', type),
    getItemInfo: (itemIds: number[]) => ipcRenderer.invoke('get-item-info', itemIds),
    getPetmateCompletedWishesNum: (petmateId: number) => ipcRenderer.invoke('get-petmate-completed-wishes-num', petmateId),
    getPetmateOneWish: (petmateId: number, wishId: string) => ipcRenderer.invoke('get-petmate-one-wish', petmateId, wishId),
    getModelSize: () => ipcRenderer.invoke('get-model-size'),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    getTTSVoiceList: () => ipcRenderer.invoke('get-tts-voice-list'),
    getChatPrompt: () => ipcRenderer.invoke('get-chat-prompt'),
    getHistoryChatMessages: () => ipcRenderer.invoke('get-history-chat-messages'),
    getPlayerResources: () => ipcRenderer.invoke('get-player-resources'),
    getLocalAIStatus: () => ipcRenderer.invoke('get-local-ai-status'),

    // set && update && add
    setChatLLMConfig: (config: ChatLLMConfig) => ipcRenderer.invoke('set-chat-llm-config', config),
    setTTSLLMConfig: (config: TTSLLMConfig) => ipcRenderer.invoke('set-tts-config', config),
    updateSettings: (settings: Partial<SettingConfig>) => ipcRenderer.invoke('update-settings', settings),
    addTTSVoice: (voice: TTSVoice) => ipcRenderer.invoke('add-tts-voice', voice),
    setChatPrompt: (prompt: string) => ipcRenderer.invoke('set-chat-prompt', prompt),
    saveChatMessages: () => ipcRenderer.invoke('save-chat-messages'),
    setLocalAIEnabled: (enabled: boolean) => ipcRenderer.invoke('set-local-ai-enabled', enabled),
    downloadLocalAIModels: () => ipcRenderer.invoke('download-local-ai-models'),
    cancelLocalAIModelDownload: () => ipcRenderer.invoke('cancel-local-ai-model-download'),
    // 玩家的操作
    consumeItem: (itemId: number, count: number, petmateId: number) => ipcRenderer.invoke('consume-item', itemId, count, petmateId),
    completeCommission: (commissionId: string, requirements: { itemId: number, count: number }[], completionCount?: number) => ipcRenderer.invoke('complete-commission', commissionId, requirements, completionCount),
    buyItem: (itemId: number, count: number) => ipcRenderer.invoke('buy-item', itemId, count),
    chat: (message: ChatMessage, speak: boolean = true) => ipcRenderer.invoke('chat', message, speak),
    startActivity: (petmateId: number, activityId: number) => ipcRenderer.invoke('start-activity', petmateId, activityId),
    cancelActivity: (petmateId: number) => ipcRenderer.invoke('cancel-activity', petmateId),
    claimActivityReward: (petmateId: number) => ipcRenderer.invoke('claim-activity-reward', petmateId),
    claimWishReward: (petmateId: number, wishId: string) => ipcRenderer.invoke('claim-wish-reward', petmateId, wishId),
    equipPlayerSkin: (skinId: string) => ipcRenderer.invoke('equip-player-skin', skinId),
    equipPlayerTitle: (titleId: string) => ipcRenderer.invoke('equip-player-title', titleId),
    // 克隆音色
    cloneVoice: (url: string) => ipcRenderer.invoke('clone-voice', url),
    // 监听
    onTextChunk: (callback: (event: IpcRendererEvent, text: string) => void) => ipcRenderer.on('chat-chunk', callback),
    onChatFinished: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('chat-finished', callback),
    onAudioChunk: (callback: (event: IpcRendererEvent, audio: Buffer, format?: string) => void) => ipcRenderer.on('tts-audio-chunk', callback),
    onLocalAIStatus: (callback: (event: IpcRendererEvent, status: LocalAIStatus) => void) => ipcRenderer.on('local-ai-status', callback),
    onWishGenerated: (callback: (event: IpcRendererEvent, petmateId: number) => void) => ipcRenderer.on('wish-generated', callback),
    onResetPetmatePosition: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('reset-petmate-position', callback),

    onTTSFinished: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('tts-finished', callback),
    onWishFinished: (callback: (event: IpcRendererEvent, petmateId: number, finishedWishNames: string[]) => void) => ipcRenderer.on('wish-finished', callback),
    onActivityFinished: (callback: (event: IpcRendererEvent, petmateId: number) => void) => ipcRenderer.on('activity-finished', callback),
    onPetmateAttributeDecayed: (callback: (event: IpcRendererEvent, petmateId: number) => void) => ipcRenderer.on('petmate-attribute-decayed', callback),

    onTTSFailed: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('tts-failed', callback),

    onSystemAudioActive: (callback: (event: IpcRendererEvent, active: boolean) => void) => ipcRenderer.on('system-audio-active', callback),
    onPlayerResourcesUpdated: (callback: (event: IpcRendererEvent, resources: PlayerResourceState) => void) => ipcRenderer.on('player-resources-updated', callback),

    // 移除监听器
    removeAllTextChunkListeners: () => ipcRenderer.removeAllListeners('chat-chunk'),
    removeAllChatFinishedListeners: () => ipcRenderer.removeAllListeners('chat-finished'),
    removeAllAudioChunkListeners: () => ipcRenderer.removeAllListeners('tts-audio-chunk'),
    removeAllTTSFinishedListeners: () => ipcRenderer.removeAllListeners('tts-finished'),
    removeAllTTSFailedListeners: () => ipcRenderer.removeAllListeners('tts-failed'),
    removeAllSystemAudioActiveListeners: () => ipcRenderer.removeAllListeners('system-audio-active'),
    removeAllPlayerResourcesUpdatedListeners: () => ipcRenderer.removeAllListeners('player-resources-updated'),
    removeAllLocalAIStatusListeners: () => ipcRenderer.removeAllListeners('local-ai-status'),
    onShowContextMenu: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('show-context-menu', callback),
    getSystemAudioActive: () => ipcRenderer.invoke('get-system-audio-active'),
    getPetmateWindowPosition: () => ipcRenderer.invoke('get-petmate-window-position'),
    movePetmateWindow: (x: number, y: number) => ipcRenderer.send('move-petmate-window', x, y),
    startPetmateWindowDrag: () => ipcRenderer.send('start-petmate-window-drag'),
    stopPetmateWindowDrag: () => ipcRenderer.send('stop-petmate-window-drag'),
    // 其他方法
    listenTTSVoiceSample: (voice: TTSVoice, text: string = '你好，主人，欢迎试听我的音色呢') => ipcRenderer.invoke('listen-tts-voice-sample', voice, text),
    openNewWindow: (route: string, width?: number, height?: number) => ipcRenderer.invoke('open-new-window', route, width, height),
    closeWindow: () => ipcRenderer.send('close-window'),
    openOpt: () => ipcRenderer.invoke('open-opt'),
    quitApp: () => ipcRenderer.send('quit-app')
})

contextBridge.exposeInMainWorld('windowMonitor', {
    start: (interval?: number) => ipcRenderer.invoke('window-monitor-start', interval),
    stop: () => ipcRenderer.invoke('window-monitor-stop'),
    getScreenResolution: () => ipcRenderer.invoke('get-screen-resolution'),
    getStatus: () => ipcRenderer.invoke('window-monitor-status'),
    getWindows: () => ipcRenderer.invoke('window-monitor-get-windows'),
    setInterval: (interval: number) => ipcRenderer.invoke('window-monitor-set-interval', interval),
    onWindowOpened: (callback: (event: IpcRendererEvent, windowEvent: WindowEvent) => void) => ipcRenderer.on('window-opened', callback),
    onWindowClosed: (callback: (event: IpcRendererEvent, windowEvent: WindowEvent) => void) => ipcRenderer.on('window-closed', callback),
    onWindowChanged: (callback: (event: IpcRendererEvent, windowEvent: WindowEvent) => void) => ipcRenderer.on('window-changed', callback),

    removeWindowListeners: () => {
        ipcRenderer.removeAllListeners('window-opened')
        ipcRenderer.removeAllListeners('window-closed')
        ipcRenderer.removeAllListeners('window-changed')
    }
})

contextBridge.exposeInMainWorld('server', {
    recoverData: () => ipcRenderer.invoke('recover-data')
})
