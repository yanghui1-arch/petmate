/**
 * 存储模块，负责游戏数据的存档
 */

import Store from 'electron-store';
import { PetMate } from './petmate/petmate';
import { notActivityPetmateStatus } from '../types/petmate';
import { Item } from '../types/item';
import { PlayerInfo } from '../types/player';
import { ActivityInfo } from '../types/activity';
import { Dass, DEFAULT_DASS_ATTRIBUTE } from './petmate/dass';
import { readJsonFile } from './utils/file';
import { NotEnoughError, NotFoundError } from '../error';
import { Buff } from '../types/buff';

type PlayerStoreData = {
    playerInfo: PlayerInfo;
}

type ActivityStoreData = {
    activityInfo: ActivityInfo[];
}

type BuffStoreData = {
    buffInfo: Buff[];
}

type ItemStoreData = {
    itemInfo: Item[];
}

/**
 * 玩家信息管理器
 * 负责玩家信息的读取、更新和持久化
 */
class PlayerManager {
    private store: Store<PlayerStoreData>;
    private currentPlayer: PlayerInfo = {
        name: '主人',
        petmates: [new Dass(0, "Dass", DEFAULT_DASS_ATTRIBUTE, notActivityPetmateStatus, [], 0)],
        steam_id: null,
        qq: null,
        cash: 500,
        items: new Map()
    };

    constructor() {
        this.store = new Store<PlayerStoreData>({
            name: 'player-store'
        });
        this.loadPlayer();
    }

    /**
     * 从存储中加载玩家信息
     */
    private loadPlayer(): void {
        const stored = (this.store as any).get('playerInfo') as PlayerInfo | undefined;
        if (!stored) {
            // 先发http请求获取玩家信息
            const result = null;
            // 如果没有获取到，使用默认值
            if (!result) {
                this.savePlayer(); // 保存默认值
            }
        } else {
            // 重建PetMate实例，因为从存储加载的是普通对象，没有方法
            const reconstructedPetmates: PetMate[] = stored.petmates.map((petmateData: any) => {
                // 根据petmate的类型创建对应的实例，目前只有Dass类型
                return new Dass(
                    petmateData.id,
                    petmateData.name,
                    petmateData.attrs,
                    petmateData.status,
                    petmateData.wishes,
                    petmateData.completedWishesNum
                );
            });

            // 重建items Map，因为Map在JSON序列化时会丢失
            const reconstructedItems = new Map<number, number>();
            if (stored.items) {
                // 如果items是对象形式（从JSON反序列化），转换为Map
                if (typeof stored.items === 'object' && !(stored.items instanceof Map)) {
                    Object.entries(stored.items).forEach(([key, value]) => {
                        reconstructedItems.set(parseInt(key), value as number);
                    });
                } else if (stored.items instanceof Map) {
                    // 如果已经是Map，直接使用
                    stored.items.forEach((value, key) => {
                        reconstructedItems.set(key, value);
                    });
                }
            }

            this.currentPlayer = {
                ...stored,
                petmates: reconstructedPetmates,
                items: reconstructedItems
            };
        }
    }

    /**
     * 保存当前玩家信息到存储
     */
    private savePlayer(): void {
        // 将Map转换为普通对象以便JSON序列化
        const itemsAsObject: { [key: string]: number } = {};
        this.currentPlayer.items.forEach((value, key) => {
            itemsAsObject[key.toString()] = value;
        });

        const dataToSave = {
            ...this.currentPlayer,
            items: itemsAsObject
        };

        (this.store as any).set('playerInfo', dataToSave);
    }

    /**
     * 获取玩家信息
     */
    getPlayer(): PlayerInfo {
        return { ...this.currentPlayer };
    }

    /**
     * 更新玩家信息
     */
    updatePlayer(updates: Partial<PlayerInfo>): void {
        this.currentPlayer = {
            ...this.currentPlayer,
            ...updates
        };
        this.savePlayer();
    }

    /**
     * 添加petmate
     */
    addPetmate(petmate: PetMate): void {
        this.currentPlayer.petmates.push(petmate);
        this.savePlayer();
    }

    /**
     * 移除petmate
     */
    removePetmate(id: number): void {
        this.currentPlayer.petmates = this.currentPlayer.petmates.filter(pet => pet.id !== id);
        this.savePlayer();
    }

    /**
     * 更新petmate信息
     * 会同步到文件中且会改变内存中的值，这意味着你无需手动修改this.currentPlayer.petmates中的值
     * @param updatedPetmate 更新的petmate
     * @throws 如果petmate不存在则抛出NotFoundError
     */
    updatePetmate(updatedPetmate: PetMate): void {
        const index = this.currentPlayer.petmates.findIndex(petmate => petmate.id === updatedPetmate.id);
        if (index !== -1) {
            this.currentPlayer.petmates[index] = updatedPetmate;
            this.savePlayer();
        } else {
            throw new NotFoundError(`Petmate不存在: ${updatedPetmate.id}`);
        }
    }

    /**
     * 更新金钱
     * 该方法不会计算buff效果，需要先计算好buff的加值以后再调用该方法
     * @param amount 增加的金额，为正数时是增加，为负数时是减少
     * @throws 如果金钱不足则抛出NotEnoughError
     */
    updateCash(amount: number): void {
        if (this.currentPlayer.cash + amount < 0) {
            throw new NotEnoughError("金钱不足");
        }
        this.currentPlayer.cash += amount;
        this.savePlayer();
    }

    /**
     * 添加物品
     * @param item 物品
     */
    addItem(item: Item): void {
        this.currentPlayer.items.set(item.id, (this.currentPlayer.items.get(item.id) || 0) + 1);
        this.savePlayer();
    }
    
    /**
     * 减少物品
     * @param id 物品id
     * @returns 是否减少成功
     */
    removeItem(id: number): boolean {
        const count = this.currentPlayer.items.get(id);
        if (count === undefined) {
            return false;
        }
        this.currentPlayer.items.set(id, count - 1);
        if (count === 1) {
            this.currentPlayer.items.delete(id);
        }
        this.savePlayer();
        return true;
    }
}

/**
 * 活动管理器
 * 负责活动信息的读取、更新和持久化
 */ 
class ActivityManager {
    private store: Store<ActivityStoreData>;
    private allActivities: ActivityInfo[] = [];

    constructor() {
        this.store = new Store<ActivityStoreData>({
            name: 'activity-store'
        });
        this.loadActivity();
    }

    loadActivity(): void {
        const stored = (this.store as any).get('activityInfo') as ActivityInfo[] | undefined;
        // 不存在的话就从assets中读取官方初始的活动
        if (!stored) {
            const activities = readJsonFile<ActivityInfo>('src/main/assets/activity.json');
            (this.store as any).set('activityInfo', activities);
            this.allActivities = activities;
        } else {
            this.allActivities = stored;
        }
    }

    /**
     * 获取所有活动
     * @returns 所有活动
     */
    getAllActivities(): ActivityInfo[] {
        return this.allActivities.map(activity => ({ ...activity }));
    }

    /**
     * 获取活动
     * @param id 活动id
     * @returns 活动信息，如果不存在就返回undefined
     */
    getActivity(id: number): ActivityInfo | undefined {
        return this.allActivities.find(activity => activity.id === id);
    }

}


/**
 * Buff管理器
 * 负责buff信息的读取、更新和持久化
 */
class BuffManager {
    private store: Store<BuffStoreData>;
    private buffs: Buff[] = [];

    constructor() {
        this.store = new Store<BuffStoreData>({
            name: 'buff-store'
        });
        this.loadBuff();
    }

    loadBuff(): void {
        const stored = (this.store as any).get('buffInfo') as Buff[] | undefined;
        if (!stored) {
            const buffs = readJsonFile<Buff>('src/main/assets/buff.json');
            (this.store as any).set('buffInfo', buffs);
            this.buffs = buffs;
        } else {
            this.buffs = stored;
        }
    }

    /**
     * 获取所有buff
     * @returns 所有buff
     */
    getAllBuffs(): Buff[] {
        return this.buffs.map(buff => ({ ...buff }));
    }

    /**
     * 获取特定Buff
     */
    getBuff(id: number): Buff | undefined {
        return this.buffs.find(buff => buff.id === id);
    }
}

class ItemManager {
    private store: Store<ItemStoreData>;
    private items: Item[] = [];

    constructor() {
        this.store = new Store<ItemStoreData>({
            name: 'item-store'
        });
        this.loadItem();
    }

    loadItem(): void {
        const stored = (this.store as any).get('itemInfo') as Item[] | undefined;
        if (!stored) {
            const items = readJsonFile<Item>('src/main/assets/item.json');
            (this.store as any).set('itemInfo', items);
            this.items = items;
        } else {
            this.items = stored;
        }
    }

    /**
     * 获取所有物品
     * @returns 所有物品
     */
    getAllItems(): Item[] {
        return this.items.map(item => ({ ...item }));
    }

    /**
     * 获取物品
     * @param id 物品id
     * @returns 物品信息，如果不存在就返回undefined
     */
    getItem(id: number): Item | undefined {
        return this.items.find(item => item.id === id);
    }
}

// Create a singleton instance
export const playerManager = new PlayerManager();
export const activityManager = new ActivityManager();
export const buffManager = new BuffManager();
export const itemManager = new ItemManager();