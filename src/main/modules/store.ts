/**
 * 存储模块，负责游戏数据的存档
 */

import Store from 'electron-store'
import { PetMate } from './petmate/petmate'
import { notActivityPetmateStatus } from '../types/petmate'
import { Item } from '../types/item'
import { PlayerInfo } from '../types/player'
import { ActivityInfo } from '../types/activity'
import { Dass, DEFAULT_DASS_ATTRIBUTE } from './petmate/dass'
import { readJsonFile } from './utils/file'
import { NotEnoughError, NotFoundError } from '../error'
import { Buff } from '../types/buff'
import { PrefabWish } from '../types/wish'
import activityFilePath from '../../../resources/data/activity.json?commonjs-external&asset'
import buffFilePath from '../../../resources/data/buff.json?commonjs-external&asset'
import wishFilePath from '../../../resources/data/prefab_wish.json?commonjs-external&asset'
import itemFilePath from '../../../resources/data/item.json?commonjs-external&asset'

type PlayerStoreData = {
  playerInfo: PlayerInfo
}

type ActivityStoreData = {
  activityInfo: ActivityInfo[]
}

type BuffStoreData = {
  buffInfo: Buff[]
}

type ItemStoreData = {
  itemInfo: Item[]
}

type PrefabWishStoreData = {
  prefabWishInfo: PrefabWish[]
}

/**
 * 玩家信息管理器
 * 负责玩家信息的读取、更新和持久化
 */
class PlayerManager {
    private store: Store<PlayerStoreData>
    private currentPlayer: PlayerInfo = {
        name: '主人',
        petmates: [new Dass(0, 'Dass', DEFAULT_DASS_ATTRIBUTE, notActivityPetmateStatus, [], 0)],
        steam_id: null,
        qq: null,
        cash: 500,
        items: []
    }

    constructor() {
        this.store = new Store<PlayerStoreData>({
            name: 'player-store'
        })
        this.loadPlayer()
    }

    /**
     * 从存储中加载玩家信息
     */
    private loadPlayer(): void {
        const stored = (this.store as any).get('playerInfo') as PlayerInfo | undefined
        if (!stored) {
            // 先发http请求获取玩家信息
            const result = null
            // 如果没有获取到，使用默认值
            if (!result) {
                this.savePlayer() // 保存默认值
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
                )
            })

            this.currentPlayer = {
                ...stored,
                petmates: reconstructedPetmates
            }
        }
    }

    /**
     * 保存当前玩家信息到存储
     */
    private savePlayer(): void {
        (this.store as any).set('playerInfo', this.currentPlayer)
    }

    /**
     * 获取玩家信息
     */
    getPlayer(): PlayerInfo {
        return { ...this.currentPlayer }
    }

    /**
     * 更新玩家信息
     */
    updatePlayer(updates: Partial<PlayerInfo>): void {
        this.currentPlayer = {
            ...this.currentPlayer,
            ...updates
        }
        this.savePlayer()
    }

    /**
     * 添加petmate
     */
    addPetmate(petmate: PetMate): void {
        this.currentPlayer.petmates.push(petmate)
        this.savePlayer()
    }

    /**
     * 移除petmate
     */
    removePetmate(id: number): void {
        this.currentPlayer.petmates = this.currentPlayer.petmates.filter(pet => pet.id !== id)
        this.savePlayer()
    }

    /**
     * 更新petmate信息
     * 会同步到文件中且会改变内存中的值，这意味着你无需手动修改this.currentPlayer.petmates中的值
     * @param updatedPetmate 更新的petmate
     * @throws 如果petmate不存在则抛出NotFoundError
     */
    updatePetmate(updatedPetmate: PetMate): void {
        const index = this.currentPlayer.petmates.findIndex(petmate => petmate.id === updatedPetmate.id)
        if (index !== -1) {
            this.currentPlayer.petmates[index] = updatedPetmate
            this.savePlayer()
        } else {
            throw new NotFoundError(`Petmate不存在: ${updatedPetmate.id}`)
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
            throw new NotEnoughError('金钱不足')
        }
        this.currentPlayer.cash += amount
        this.savePlayer()
    }
}

/**
 * 活动管理器
 * 负责活动信息的读取、更新和持久化
 */
class ActivityManager {
    private store: Store<ActivityStoreData>
    private allActivities: ActivityInfo[] = []

    constructor() {
        this.store = new Store<ActivityStoreData>({
            name: 'activity-store'
        })
        this.loadActivity()
    }

    loadActivity(): void {
        const activities: ActivityInfo[] = readJsonFile<ActivityInfo>(activityFilePath);
        (this.store as any).set('activityInfo', activities)
        this.allActivities = activities
    }

    /**
     * 获取所有活动
     * @returns 所有活动
     */
    getAllActivities(): ActivityInfo[] {
        return this.allActivities.map(activity => ({ ...activity }))
    }

    /**
     * 获取活动
     * @param id 活动id
     * @returns 活动信息，如果不存在就返回undefined
     */
    getActivity(id: number): ActivityInfo | undefined {
        return this.allActivities.find(activity => activity.id === id)
    }

}


/**
 * Buff管理器
 * 负责buff信息的读取、更新和持久化
 */
class BuffManager {
    private store: Store<BuffStoreData>
    private buffs: Buff[] = []

    constructor() {
        this.store = new Store<BuffStoreData>({
            name: 'buff-store',
        })
        this.loadBuff()
    }

    loadBuff(): void {
        const buffs = readJsonFile<Buff>(buffFilePath);
        (this.store as any).set('buffInfo', buffs)
        this.buffs = buffs
    }

    /**
     * 获取所有buff
     * @returns 所有buff
     */
    getAllBuffs(): Buff[] {
        return this.buffs.map(buff => ({ ...buff }))
    }

    /**
     * 获取特定Buff
     */
    getBuff(id: number): Buff | undefined {
        return this.buffs.find(buff => buff.id === id)
    }
}

/**
 * 物品管理器
 * 负责物品信息的读取、更新和持久化
 */
class ItemManager {
    private store: Store<ItemStoreData>
    private items: Item[] = []

    constructor() {
        this.store = new Store<ItemStoreData>({
            name: 'item-store'
        })
        this.loadItem()
    }

    loadItem(): void {
        const items = readJsonFile<Item>(itemFilePath);
        (this.store as any).set('itemInfo', items)
        console.log(items)
        this.items = items
    }

    /**
     * 获取所有物品
     * @returns 所有物品
     */
    getAllItems(): Item[] {
        return this.items.map(item => ({ ...item }))
    }

    /**
     * 获取物品
     * @param id 物品id
     * @returns 物品信息，如果不存在就返回undefined
     */
    getItem(id: number): Item | undefined {
        return this.items.find(item => item.id === id)
    }
}

class PrefabWishManager {
    private store: Store<PrefabWishStoreData>
    private prefabWishes: PrefabWish[] = []

    constructor() {
        this.store = new Store<PrefabWishStoreData>({
            name: 'prefab-wish-store'
        })
        this.loadPrefabWish()
    }

    loadPrefabWish(): void {
        const prefabWishes = readJsonFile<PrefabWish>(wishFilePath);
        (this.store as any).set('prefabWishInfo', prefabWishes)
        this.prefabWishes = prefabWishes
    }

    getAllPrefabWishes(): PrefabWish[] {
        return this.prefabWishes.map(wish => ({ ...wish }))
    }
}

// Create a singleton instance
export const playerManager = new PlayerManager()
export const activityManager = new ActivityManager()
export const buffManager = new BuffManager()
export const itemManager = new ItemManager()
export const prefabWishManager = new PrefabWishManager()