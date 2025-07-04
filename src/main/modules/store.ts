/**
 * 存储模块，负责游戏数据的存档
 */

import Store from 'electron-store';
import { PetMate } from './petmate/petmate';
import { PetMateAttribute } from '../types/petmate';

export type PlayerInfo = {
    steam_id?: string | null;
    name: string;
    qq?: string | null;
    petmates: Array<PetMate>;
    cash: number;
}

type StoreData = {
    playerInfo: PlayerInfo;
}

/**
 * 玩家信息管理器
 * 负责玩家信息的读取、更新和持久化
 */
class PlayerManager {
    private store: Store<StoreData>;
    private currentPlayer: PlayerInfo = {
        name: '主人',
        petmates: [],
        steam_id: null,
        qq: null,
        cash: 500
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
        this.currentPlayer.petmates = this.currentPlayer.petmates.filter(pet => pet.attrs.id !== id);
        this.savePlayer();
    }

    /**
     * 更新petmate信息
     */
    updatePetmate(id:number, updatedPet: Partial<PetMateAttribute>): void {
        const index = this.currentPlayer.petmates.findIndex(petmate => petmate.attrs.id === id);
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
     */
    updateCash(amount: number): void {
        this.currentPlayer.cash += amount;
        this.savePlayer();
    }
}

// Create a singleton instance
export const playerManager = new PlayerManager();