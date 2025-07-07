/**
 * 存储模块，负责游戏数据的存档
 */

import Store from 'electron-store';
import { PetMate } from './petmate/petmate';
import { notActivityPetmateStatus, PetMateAttribute } from '../types/petmate';
import { Item } from '../types/item';
import { PlayerInfo } from '../types/player';
import { ActivityInfo } from '../types/activity';
import { Dass, DEFAULT_DASS_ATTRIBUTE } from './petmate/dass';
import { readJsonFile } from './utils/file';
import { NotEnoughError } from '../error';

type StoreData = {
    playerInfo: PlayerInfo;
    activityInfo: ActivityInfo;
}

/**
 * 玩家信息管理器
 * 负责玩家信息的读取、更新和持久化
 */
class PlayerManager {
    private store: Store<StoreData>;
    private currentPlayer: PlayerInfo = {
        name: '主人',
        petmates: [new Dass(0, "Dass", DEFAULT_DASS_ATTRIBUTE, notActivityPetmateStatus)],
        steam_id: null,
        qq: null,
        cash: 500,
        items: new Map()
    };

    constructor() {
        this.store = new Store<StoreData>();
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
            this.currentPlayer = stored;
        }
    }

    /**
     * 保存当前玩家信息到存储
     */
    private savePlayer(): void {
        (this.store as any).set('playerInfo', this.currentPlayer);
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
     */
    updatePetmate(id:number, updatedPet: Partial<PetMateAttribute>): void {
        const index = this.currentPlayer.petmates.findIndex(petmate => petmate.id === id);
        if (index !== -1) {
            const newAttrs:PetMateAttribute = {
                ...this.currentPlayer.petmates[index].attrs,
                ...updatedPet   
            };
            this.currentPlayer.petmates[index].attrs = newAttrs;
            this.savePlayer();
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
    private store: Store<StoreData>;
    private allActivities: ActivityInfo[] = [];

    constructor() {
        this.store = new Store<StoreData>();
        this.loadActivity();
    }

    loadActivity(): void {
        const stored = (this.store as any).get('allActivities') as ActivityInfo[] | undefined;
        // 不存在的话就从assets中读取官方初始的活动
        if (!stored) {
            const activities = readJsonFile<ActivityInfo>('src/main/assets/activity.json');
            (this.store as any).set('allActivities', activities);
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

// Create a singleton instance
export const playerManager = new PlayerManager();
export const activityManager = new ActivityManager();