import { Response } from "../../types/response";
import { LocalAIStatus } from "../main/local-ai";
import { ActivityInfo } from "../main/types/activity";
import type { BackupPreview, FarmAssistantEvent, FarmAssistantStatus, FarmCommand, FarmOperation, FarmPreview, FarmResult, FarmView } from '../main/types/farm';
import { Item, ItemType } from "../main/types/item";
import { ConsumeItemResult, PlayerInfo } from "../main/types/player";
import { CommissionCompletionResult, PlayerResourceState } from "../main/types/player-resource";
import {
  SchoolHandbookClaimRewardResult,
  SchoolHandbookProgress
} from "../main/types/school-handbook";
import type { VersionReminderState } from "../main/types/version-reminder";
import { Wish } from "../main/types/wish"
import { WindowEvent, WindowInfo } from "../main/window-monitor";
import type { FarmLifeEvent, FarmLifeView } from '../shared/farmLife';
import { SettingConfig } from "../types/config";
import { ChatLLMConfig, ChatMessage, TTSLLMConfig, TTSVoice } from "./llm";
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
  getVersionReminder: () => Promise<Response<VersionReminderState>>;
  acknowledgeVersionReminder: () => Promise<Response<VersionReminderState>>;
  dismissVersionReward: () => Promise<Response<VersionReminderState>>;
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
  getPlayerResources: () => Promise<Response<PlayerResourceState>>;
  getSchoolHandbookProgress: (date?: string) => Promise<Response<SchoolHandbookProgress>>;
  getLocalAIStatus: () => Promise<Response<LocalAIStatus>>;
  getFarm: () => Promise<Response<FarmView>>;
  getFarmLife: () => Promise<Response<FarmLifeView>>;
  enterFarmLife: () => Promise<Response<FarmLifeView>>;
  leaveFarmLife: () => Promise<Response<void>>;
  readyFarmLife: () => Promise<Response<void>>;
  markFarmDiaryShown: (id: string) => Promise<Response<void>>;
  farmLifePetState: (_ready: boolean, _blocked: boolean) => void;
  farmLifeInteraction: () => void;
  finishFarmLifeSpeech: (_id: string) => void;
  onFarmLifeState: (callback: (_state: FarmLifeView & { direction?: 'left' | 'right' }) => void) => () => void;
  onFarmLifeSpeech: (callback: (_speech: { stage: 'start' | 'return'; event: FarmLifeEvent }) => void) => () => void;
  getFarmAssistant: () => Promise<Response<FarmAssistantStatus>>;
  farmManualActivity: () => Promise<Response<void>>;
  onFarmAssistantState: (callback: (status: FarmAssistantStatus) => void) => () => void;
  onFarmAssistantEvent: (callback: (event: FarmAssistantEvent) => void) => () => void;
  previewFarm: (operation: FarmOperation) => Promise<Response<FarmPreview>>;
  executeFarm: (command: FarmCommand) => Promise<Response<FarmResult>>;
  checkpointFarm: () => Promise<Response<void>>;
  exportFarmBackup: () => Promise<Response<string | null>>;
  selectFarmBackup: () => Promise<Response<BackupPreview | null>>;
  getAutomaticFarmBackup: () => Promise<Response<BackupPreview | null>>;
  restoreFarmBackup: (token: string) => Promise<Response<void>>;
  onGameSaveChanged: (callback: () => void) => () => void;

  // set && update && add
  setChatLLMConfig: (config: ChatLLMConfig) => Promise<Response<ChatLLMConfig>>;
  setTTSLLMConfig: (config: TTSLLMConfig) => Promise<Response<TTSLLMConfig>>;
  updateSettings: (settings: Partial<SettingConfig>) => Promise<Response<SettingConfig>>;
  addTTSVoice: (voice: TTSVoice) => Promise<Response<void>>;
  setChatPrompt: (prompt: string) => Promise<Response<void>>;
  saveChatMessages: () => Promise<Response<void>>;
  setLocalAIEnabled: (enabled: boolean) => Promise<Response<LocalAIStatus>>;
  downloadLocalAIModels: () => Promise<Response<LocalAIStatus>>;
  cancelLocalAIModelDownload: () => Promise<Response<LocalAIStatus>>;

  // 玩家操作
  consumeItem: (itemId: number, count: number, petmateId: number) => Promise<Response<ConsumeItemResult | void>>;
  completeCommission: (commissionId: string, requirements: { itemId: number, count: number }[], completionCount?: number) => Promise<Response<CommissionCompletionResult>>;
  buyItem: (itemId: number, count: number) => Promise<Response<Item>>;
  chat: (message: ChatMessage, speak?: boolean) => Promise<Response<void>>;
  startActivity: (petmateId: number, activityId: number) => Promise<Response<void>>;
  cancelActivity: (petmateId: number) => Promise<Response<void>>;
  claimActivityReward: (petmateId: number) => Promise<Response<void>>;
  claimWishReward: (petmateId: number, wishId: string) => Promise<Response<boolean>>;
  equipPlayerSkin: (skinId: string) => Promise<Response<PlayerResourceState>>;
  equipPlayerTitle: (titleId: string) => Promise<Response<PlayerResourceState>>;
  claimSchoolHandbookReward: (milestoneIdOrStampCount: string | number, quantity?: number) => Promise<Response<SchoolHandbookClaimRewardResult>>;

  // 克隆音色
  cloneVoice: (url: string) => Promise<Response<string>>;

  // 监听
  onTextChunk: (callback: (event: Event, text: string) => void) => void;
  onChatFinished: (callback: (event: Event) => void) => void;
  onAudioChunk: (callback: (event: Event, audio: Buffer, format?: string) => void) => void;
  onLocalAIStatus: (callback: (event: Event, status: LocalAIStatus) => void) => void;
  onWishGenerated: (callback: (event: Event, petmateId: number) => void) => void,
  onResetPetmatePosition: (callback: (event: Event) => void) => void,
  onTTSFinished: (callback: (event: Event) => void) => void,
  onTTSFailed: (callback: (event: Event) => void) => void,
  onWishFinished: (callback: (event: Event, petmateId: number, finishedWishNames: string[]) => void) => void,
  onActivityFinished: (callback: (event: Event, petmateId: number) => void) => void,
  onPetmateAttributeDecayed: (callback: (event: Event, petmateId: number) => void) => void,
  onShowContextMenu: (callback: (event: Event) => void) => void,
  onSystemAudioActive: (callback: (event: Event, active: boolean) => void) => void,
  onPlayerResourcesUpdated: (callback: (event: Event, resources: PlayerResourceState) => void) => void,
  removeAllTextChunkListeners: () => void;
  removeAllChatFinishedListeners: () => void;
  removeAllAudioChunkListeners: () => void;
  removeAllTTSFinishedListeners: () => void;
  removeAllTTSFailedListeners: () => void;
  removeAllSystemAudioActiveListeners: () => void;
  removeAllPlayerResourcesUpdatedListeners: () => void;
  removeAllLocalAIStatusListeners: () => void;
  getSystemAudioActive: () => Promise<boolean>;
  getPetmateWindowPosition: () => Promise<{x: number, y: number}>;
  movePetmateWindow: (x: number, y: number) => void;
  startPetmateWindowDrag: () => void;
  stopPetmateWindowDrag: () => void;

  // 其他
  listenTTSVoiceSample: (voice: TTSVoice, text: string) => Promise<Response<void>>;
  openNewWindow: (route: string, width?: number, height?: number) => Promise<Response<void>>;
  resizePageForRoute: (route: string) => Promise<Response<void>>;
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
