interface PlayerInfo {
    steam_id?: string | null;
    name: string;
    qq?: string | null;
    petmates: number[];
}

/**
 * 与主进程通信的接口
 * 所有方法都返回Promise
 */
export interface IElectronAPI {
  loadPlayerData: () => Promise<Response<PlayerInfo>>;
  consumeItem: (itemId: number, count: number, petmateId: number) => Promise<Response<void>>;
  buyItem: (itemId: number, count: number) => Promise<Response<Item>>;
}

// 声明全局window对象，之后渲染层直接window.api.function() 调用即可
declare global {
  interface Window {
    api: IElectronAPI;
  }
}