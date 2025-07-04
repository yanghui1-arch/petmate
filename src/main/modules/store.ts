/**
 * 存储模块，负责游戏数据的存档
 */

import Store from 'electron-store';
import { ipcMain } from 'electron';

export type PlayerInfo = {
    steam_id?: string | null,
    name: string,
    qq?: string | null,
    petmates: Array<number>,
}

interface StoreSchema {
    playerInfo: PlayerInfo;
}

// Define the schema for type safety and validation
const schema = {
    playerInfo: {
        type: 'object',
        properties: {
            steam_id: {
                type: ['string', 'null'],
                default: null
            },
            name: {
                type: 'string',
                default: '主人'
            },
            qq: {
                type: ['string', 'null'],
                default: null
            },
            petmates: {
                type: 'array',
                items: {
                    type: 'number'
                },
                default: []
            }
        },
        required: ['name', 'petmates']
    }
} as const;

// Initialize store with schema and type assertion
const store = new Store<StoreSchema>({
    schema
}) as Store<StoreSchema> & {
    get<K extends keyof StoreSchema>(key: K): StoreSchema[K];
    set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void;
};

// IPC处理渲染进程的请求
ipcMain.handle('store:savePlayerInfo', async (_event, playerInfo: PlayerInfo) => {
    try {
        store.set('playerInfo', playerInfo);
        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('无法保存玩家信息:', errorMessage);
        return { success: false, error: errorMessage };
    }
});

ipcMain.handle('store:loadPlayerInfo', async () => {
    try {
        const playerInfo = store.get('playerInfo');
        return { success: true, data: playerInfo };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Failed to load player info:', errorMessage);
        return { success: false, error: errorMessage };
    }
});

// Export functions for main process use
export function savePlayerInfo(playerInfo: PlayerInfo): void {
    store.set('playerInfo', playerInfo);
}

export function loadPlayerInfo(): PlayerInfo {
    return store.get('playerInfo');
}