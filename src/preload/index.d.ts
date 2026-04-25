import { Response } from "../../types/response";
import { PlayerInfo } from "../main/types/player";
import { Item, ItemType } from "../main/types/item";
import { Wish } from "../main/types/wish"
import { ActivityInfo } from "../main/types/activity";
import { SettingConfig } from "./settings";
import { ChatLLMConfig, ChatMessage, TTSLLMConfig, TTSVoice } from "./llm";
import { WindowEvent, WindowInfo } from "../main/window-monitor";
/**
 * 与主进程通信的接口
 * 所有方法都返回Promise
 */
interface IElectronAPI {
  // 初始化
  initSettings: () => Promise<Response<SettingConfig>>;
  initLLM: () => Promise<Response<void>>;

  // get && show
  getCurrentPlayerData: () => Promise<Response<PlayerInfo>>;
  showActivities: (type: ActivityInfo["type"]) => Promise<Response<ActivityInfo[]>>;
  showItems: (type: ItemType) => Promise<Response<Item[]>>;
  getItemInfo: (itemIds: number[]) => Promise<Response<Item[]>>;
  getPetmateCompletedWishesNum: (petmateId: number) => Promise<Response<number>>;
  getPetmateOneWish: (petmateId: number, wishId: string) => Promise<Response<Wish>>;
  getModelSize: () => Promise<Response<number>>;
  getChatLLMConfig: () => Promise<Response<ChatLLMConfig>>;
  getTTSLLMConfig: () => Promise<Response<TTSLLMConfig>>;
  getSettings: () => Promise<Response<SettingConfig>>;
  getTTSVoiceList: () => Promise<Response<TTSVoice[]>>;
  getChatPrompt: () => Promise<Response<string>>;
  getHistoryChatMessages: () => Promise<Response<HistoryChatMessage[]>>;

  // set && update && add
  setChatLLMConfig: (config: ChatLLMConfig) => Promise<Response<ChatLLMConfig>>;
  setTTSLLMConfig: (config: TTSLLMConfig) => Promise<Response<TTSLLMConfig>>;
  updateSettings: (settings: Partial<SettingConfig>) => Promise<Response<void>>;
  addTTSVoice: (voice: TTSVoice) => Promise<Response<void>>;
  setChatPrompt: (prompt: string) => Promise<Response<void>>;
  saveChatMessages: () => Promise<Response<void>>;

  // 玩家操作
  consumeItem: (itemId: number, count: number, petmateId: number) => Promise<Response<void>>;
  submitCommissionRequirements: (requirements: { itemId: number, count: number }[]) => Promise<Response<void>>;
  buyItem: (itemId: number, count: number) => Promise<Response<Item>>;
  chat: (message: ChatMessage) => Promise<Response<void>>;
  startActivity: (petmateId: number, activityId: number) => Promise<Response<void>>;
  cancelActivity: (petmateId: number) => Promise<Response<void>>;
  claimActivityReward: (petmateId: number) => Promise<Response<void>>;
  claimWishReward: (petmateId: number, wishId: string) => Promise<Response<boolean>>;

  // 克隆音色
  cloneVoice: (url: string) => Promise<Response<string>>;

  // 监听
  onTextChunk: (callback: (event: Event, text: string) => void) => void;
  onAudioChunk: (callback: (event: Event, audio: Buffer) => void) => void;
  onWishGenerated: (callback: (event: Event, petmateId: number) => void) => void,
  onResetPetmatePosition: (callback: (event: Event) => void) => void,
  onTTSFinished: (callback: (event: Event) => void) => void,
  onTTSFailed: (callback: (event: Event) => void) => void,
  onWishFinished: (callback: (event: Event, petmateId: number, finishedWishNames: string[]) => void) => void,
  onActivityFinished: (callback: (event: Event, petmateId: number) => void) => void,
  onPetmateAttributeDecayed: (callback: (event: Event, petmateId: number) => void) => void,
  onShowContextMenu: (callback: (event: Event) => void) => void,
  onSystemAudioActive: (callback: (event: Event, active: boolean) => void) => void,
  removeAllAudioChunkListeners: () => void;
  removeAllTTSFinishedListeners: () => void;
  removeAllTTSFailedListeners: () => void;
  removeAllSystemAudioActiveListeners: () => void;
  getSystemAudioActive: () => Promise<boolean>;
  getPetmateWindowPosition: () => Promise<{x: number, y: number}>;
  movePetmateWindow: (x: number, y: number) => void;
  startPetmateWindowDrag: () => void;
  stopPetmateWindowDrag: () => void;
  onChristmasEffect: (callback: (event: Event, christmasEffect: boolean) => void) => void,

  // 其他
  listenTTSVoiceSample: (voice: TTSVoice, text: string) => Promise<Response<void>>;
  openNewWindow: (route: string, width?: number, height?: number) => Promise<Response<void>>;
  openOpt: () => Promise<Response<void>>;
  closeWindow: () => void;
  quitApp: () => Promise<Response<void>>;
}

/**
 * 窗口监控相关方法
 */
interface IWindowMonitor {
  start: (interval?: number) => Promise<Response<void>>;
  stop: () => Promise<Response<void>>;
  getScreenResolution: () => Promise<Response<{width: number, height: number, scaleFactor: number}>>;
  getStatus: () => Promise<Response<{isRunning: boolean, interval: number}>>;
  getWindows: () => Promise<Response<WindowInfo[]>>;
  setInterval: (interval: number) => Promise<Response<void>>;
  onWindowOpened: (callback: (event: Event, windowEvent: WindowEvent) => void) => void;
  onWindowClosed: (callback: (event: Event, windowEvent: WindowEvent) => void) => void;
  onWindowChanged: (callback: (event: Event, windowEvent: WindowEvent) => void) => void;
  removeWindowListeners: () => void;
}

interface IServerAPI {
  recoverData: () => Promise<Response<void>>;
}

// 声明全局window对象，之后渲染层直接window.api.function() 调用即可
declare global {
  interface Window {
    api: IElectronAPI;
    windowMonitor: IWindowMonitor;
    server: IServerAPI;
  }
}

export {};
