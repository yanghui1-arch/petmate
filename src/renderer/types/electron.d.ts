interface PlayerInfo {
    steam_id?: string | null;
    name: string;
    qq?: string | null;
    petmates: number[];
}

interface IElectronAPI {
  send(channel: 'toMain', payload: unknown): void
  receive(channel: 'fromMain', listener: (...args: any[]) => void): void
  invoke(
    channel: 'load-data',
    payload?: unknown
  ): any
}

interface Window {
    versions: {
        __versions__: string;
    };
    electronStore: {
        loadPlayerInfo: () => { success: boolean; data?: PlayerInfo; error?: string };
    };
    api: IElectronAPI
}