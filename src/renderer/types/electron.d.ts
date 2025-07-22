import { Response } from "../../types/response";
import { PlayerInfo } from "./player";
import { Item, ItemType, Wish } from "./common";
import { ActivityInfo } from "./common"; 
import { SettingConfig } from "./settings";
import { ChatLLMConfig, ChatMessage, TTSLLMConfig } from "./llm";

/**
 * 与主进程通信的接口
 * 所有方法都返回Promise
 */
interface IElectronAPI {
  // 初始化
  loadPlayerData: () => Promise<Response<PlayerInfo>>;
  initSettings: () => Promise<Response<SettingConfig>>;
  initLLM: () => Promise<Response<void>>;
  
  // get && show
  showActivities: (type: ActivityInfo["type"]) => Promise<Response<ActivityInfo[]>>;
  showItems: (type: ItemType) => Promise<Response<Item[]>>;
  getPetmateCompletedWishesNum: (petmateId: number) => Promise<Response<number>>;
  getPetmateOneWish: (petmateId: number, wishId: string) => Promise<Response<Wish>>;
  getModelSize: () => Promise<Response<number>>;
  getChatLLMConfig: () => Promise<Response<ChatLLMConfig>>;
  getTTSLLMConfig: () => Promise<Response<TTSLLMConfig>>;
  getSettings: () => Promise<Response<SettingConfig>>;

  // set && update
  setChatLLMConfig: (config: ChatLLMConfig) => Promise<Response<ChatLLMConfig>>;
  setTTSLLMConfig: (config: TTSLLMConfig) => Promise<Response<TTSLLMConfig>>;
  updateSettings: (settings: Partial<SettingConfig>) => Promise<Response<void>>;

  // 玩家操作
  consumeItem: (itemId: number, count: number, petmateId: number) => Promise<Response<void>>;
  buyItem: (itemId: number, count: number) => Promise<Response<Item>>;
  chat: (message: ChatMessage) => Promise<Response<void>>;

  // 克隆音色
  cloneVoice: (url: string) => Promise<Response<string>>;

  // 监听
  onTextChunk: (callback: (event: Event, text: string) => void) => void;
  onAudioChunk: (callback: (event: Event, audio: Buffer) => void) => void;
  removeAllAudioChunkListeners: () => void;
}

// 声明全局window对象，之后渲染层直接window.api.function() 调用即可
declare global {
  interface Window {
    api: IElectronAPI;
  }
}