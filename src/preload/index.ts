import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

import { ChatLLMConfig, ChatMessage, TTSLLMConfig, TTSVoice } from '../main/llm'
import { LocalAIStatus } from '../main/local-ai'
import { SettingConfig } from '../main/settings'
import { ActivityInfo } from '../main/types/activity'
import type { FarmAssistantEvent, FarmAssistantStatus, FarmCommand, FarmOperation } from '../main/types/farm'
import { ItemType } from '../main/types/item'
import type { PlayerResourceState } from '../main/types/player-resource'
import { WindowEvent } from '../main/window-monitor'
import type { FarmLifeEvent, FarmLifeKind, FarmLifeView } from '../shared/farmLife'
import type { FarmLifeDevelopmentCommand } from '../shared/farmLifeDevelopment'
import type { PetSpeechMessage, PetSpeechState } from '../shared/petSpeech'

/**
 * API 调用接口
 */
contextBridge.exposeInMainWorld('api', {
    updatePetSpeech: (message: PetSpeechMessage | null) => ipcRenderer.send('pet-speech-update', message),
    getPetSpeech: () => ipcRenderer.invoke('pet-speech-get'),
    petSpeechMeasured: (id: string, height: number) => ipcRenderer.send('pet-speech-measured', id, height),
    onPetSpeechState: (callback: (_state: PetSpeechState) => void) => {
        const listener = (_event: IpcRendererEvent, state: PetSpeechState) => callback(state)
        ipcRenderer.on('pet-speech-state', listener)
        return () => ipcRenderer.removeListener('pet-speech-state', listener)
    },
    // init
    initSettings: () => ipcRenderer.invoke('init-settings'),
    initLLM: () => ipcRenderer.invoke('init-llm'),

    // get && show
    getCurrentPlayerData: () => ipcRenderer.invoke('get-current-player-data'),
    getVersionReminder: () => ipcRenderer.invoke('get-version-reminder'),
    acknowledgeVersionReminder: () => ipcRenderer.invoke('acknowledge-version-reminder'),
    dismissVersionReward: () => ipcRenderer.invoke('dismiss-reward-version-reminder'),
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
    getSchoolHandbookProgress: (date?: string) => ipcRenderer.invoke('get-school-handbook-progress', date),
    getLocalAIStatus: () => ipcRenderer.invoke('get-local-ai-status'),
    getFarm: () => ipcRenderer.invoke('farm-get'),
    getFarmLife: () => ipcRenderer.invoke('farm-life-get'),
    ...(import.meta.env.DEV ? {
        getFarmLifeDevelopment: () => ipcRenderer.invoke('farm-life-development-get'),
        commandFarmLifeDevelopment: (action: FarmLifeDevelopmentCommand, kind?: FarmLifeKind) => ipcRenderer.invoke('farm-life-development-command', action, kind),
    } : {}),
    enterFarmLife: () => ipcRenderer.invoke('farm-life-enter'),
    leaveFarmLife: () => ipcRenderer.invoke('farm-life-leave'),
    readyFarmLife: () => ipcRenderer.invoke('farm-life-ready'),
    markFarmDiaryShown: (id: string) => ipcRenderer.invoke('farm-life-diary-shown', id),
    farmLifePetState: (ready: boolean, blocked: boolean) => ipcRenderer.send('farm-life-pet-state', { ready, blocked }),
    farmLifeInteraction: () => ipcRenderer.send('farm-life-interaction'),
    finishFarmLifeSpeech: (id: string) => ipcRenderer.send('farm-life-speech-finished', id),
    moveCoveredFarmDeparture: (id: string) => ipcRenderer.invoke('farm-life-departure-covered', id),
    onFarmDepartureShift: (callback: (_request: { id: string }) => void) => { const listener = (_event: IpcRendererEvent, request: { id: string }) => callback(request); ipcRenderer.on('farm-life-departure-shift', listener); return () => ipcRenderer.removeListener('farm-life-departure-shift', listener) },
    onFarmLifeState: (callback: (_state: FarmLifeView & { direction?: 'left' | 'right' }) => void) => { const listener = (_event: IpcRendererEvent, state: FarmLifeView) => callback(state); ipcRenderer.on('farm-life-state', listener); return () => ipcRenderer.removeListener('farm-life-state', listener) },
    onFarmLifeSpeech: (callback: (_speech: { stage: 'start' | 'return'; event: FarmLifeEvent }) => void) => { const listener = (_event: IpcRendererEvent, speech: { stage: 'start' | 'return'; event: FarmLifeEvent }) => callback(speech); ipcRenderer.on('farm-life-speech', listener); return () => ipcRenderer.removeListener('farm-life-speech', listener) },
    getFarmAssistant: () => ipcRenderer.invoke('farm-assistant-get'),
    farmManualActivity: () => ipcRenderer.invoke('farm-manual-activity'),
    onFarmAssistantState: (callback: (status: FarmAssistantStatus) => void) => { const listener = (_event: IpcRendererEvent, status: FarmAssistantStatus) => callback(status); ipcRenderer.on('farm-assistant-state', listener); return () => ipcRenderer.removeListener('farm-assistant-state', listener) },
    onFarmAssistantEvent: (callback: (event: FarmAssistantEvent) => void) => { const listener = (_event: IpcRendererEvent, event: FarmAssistantEvent) => callback(event); ipcRenderer.on('farm-assistant-event', listener); return () => ipcRenderer.removeListener('farm-assistant-event', listener) },
    previewFarm: (operation: FarmOperation) => ipcRenderer.invoke('farm-preview', operation),
    executeFarm: (command: FarmCommand) => ipcRenderer.invoke('farm-execute', command),
    checkpointFarm: () => ipcRenderer.invoke('farm-checkpoint'),
    exportFarmBackup: () => ipcRenderer.invoke('farm-backup-export'),
    selectFarmBackup: () => ipcRenderer.invoke('farm-backup-select'),
    getAutomaticFarmBackup: () => ipcRenderer.invoke('farm-backup-automatic'),
    restoreFarmBackup: (token: string) => ipcRenderer.invoke('farm-backup-restore', token),
    onGameSaveChanged: (callback: () => void) => { const listener = () => callback(); ipcRenderer.on('game-save-changed', listener); return () => ipcRenderer.removeListener('game-save-changed', listener) },

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
    claimSchoolHandbookReward: (milestoneIdOrStampCount: string | number, quantity: number = 1) => ipcRenderer.invoke('claim-school-handbook-reward', milestoneIdOrStampCount, quantity),
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
    resizePageForRoute: (route: string) => ipcRenderer.invoke('resize-page-for-route', route),
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
