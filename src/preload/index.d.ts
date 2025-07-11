import { Response } from "../types/response";
import { PlayerInfo } from "../main/types/player";
import { Item, ItemType } from "../main/types/item";
import { ActivityInfo } from "../main/types/activity"; 
import { SettingConfig } from "../main/settings";

/**
 * 与主进程通信的接口
 * 所有方法都返回Promise
 */
interface IElectronAPI {
  loadPlayerData: () => Promise<Response<PlayerInfo>>;
  consumeItem: (itemId: number, count: number, petmateId: number) => Promise<Response<void>>;
  buyItem: (itemId: number, count: number) => Promise<Response<Item>>;
  showActivities: (type: ActivityInfo["type"]) => Promise<Response<ActivityInfo[]>>;
  showItems: (type: ItemType) => Promise<Response<Item[]>>;
  getPetmateCompletedWishesNum: (petmateId: number) => Promise<Response<number>>;
  getPetmateOneWish: (petmateId: number, wishId: string) => Promise<Response<Wish>>;
  getModelSize: () => Promise<Response<number>>;
  getSettings: () => Promise<Response<SettingConfig>>;
  updateSettings: (settings: Partial<SettingConfig>) => Promise<Response<void>>;
}

// 声明全局window对象，之后渲染层直接window.api.function() 调用即可
declare global {
  interface Window {
    api: IElectronAPI;
  }
}