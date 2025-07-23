const { contextBridge, ipcRenderer } = require("electron")
import { ChatLLMConfig, ChatMessage, TTSLLMConfig, TTSVoice } from "../main/llm"
import { SettingConfig } from "../main/settings"
import { ActivityInfo } from "../main/types/activity"
import { ItemType } from "../main/types/item"

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "api", {
        // init
        loadPlayerData: () => ipcRenderer.invoke("load-player-data"),
        initSettings: () => ipcRenderer.invoke("init-settings"),
        initLLM: () => ipcRenderer.invoke("init-llm"),
        
        // get && show
        getChatLLMConfig: () => ipcRenderer.invoke("get-chat-llm-config"),
        getTTSLLMConfig: () => ipcRenderer.invoke("get-tts-config"),
        showActivities: (type: ActivityInfo["type"]) => ipcRenderer.invoke("show-activities", type),
        showItems: (type: ItemType) => ipcRenderer.invoke("show-items", type),
        getPetmateCompletedWishesNum: (petmateId: number) => ipcRenderer.invoke("get-petmate-completed-wishes-num", petmateId),
        getPetmateOneWish: (petmateId: number, wishId: string) => ipcRenderer.invoke("get-petmate-one-wish", petmateId, wishId),
        getModelSize: () => ipcRenderer.invoke("get-model-size"),
        getSettings: () => ipcRenderer.invoke("get-settings"),
        getTTSVoiceList: () => ipcRenderer.invoke("get-tts-voice-list"),
        getChatPrompt: () => ipcRenderer.invoke("get-chat-prompt"),

        // set && update && add
        setChatLLMConfig: (config: ChatLLMConfig) => ipcRenderer.invoke("set-chat-llm-config", config),
        setTTSLLMConfig: (config: TTSLLMConfig) => ipcRenderer.invoke("set-tts-config", config),
        updateSettings: (settings: Partial<SettingConfig>) => ipcRenderer.invoke("update-settings", settings),
        addTTSVoice: (voice: TTSVoice) => ipcRenderer.invoke("add-tts-voice", voice),
        setChatPrompt: (prompt: string) => ipcRenderer.invoke("set-chat-prompt", prompt),
        
        // 玩家的操作
        consumeItem: (itemId: number, count: number, petmateId: number) => ipcRenderer.invoke("consume-item", itemId, count, petmateId),
        buyItem: (itemId: number, count: number) => ipcRenderer.invoke("buy-item", itemId, count),
        chat: (message: ChatMessage) => ipcRenderer.invoke("chat", message),

        // 克隆音色
        cloneVoice: (url: string) => ipcRenderer.invoke("clone-voice", url),

        // 监听
        onTextChunk: (callback: (event: Event, text: string) => void) => ipcRenderer.on("chat-chunk", callback),
        onAudioChunk: (callback: (event: Event, audio: Buffer) => void) => ipcRenderer.on("tts-audio-chunk", callback),
        removeAllAudioChunkListeners: () => ipcRenderer.removeAllListeners("tts-audio-chunk"),

        // 其他方法
        listenTTSVoiceSample: (voice: TTSVoice, text: string = "你好，主人，欢迎试听我的音色呢") => ipcRenderer.invoke("listen-tts-voice-sample", voice, text),
    }
)