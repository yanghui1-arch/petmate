/**
 * 暴露ipc事件
 */

import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { playerManager } from './modules/store';
import { PlayerInfo } from './types/player';
import { Response } from '../types/response';
import { consumeItem } from './modules/player/basic';
import logger from './log';
import { PetMate } from './modules/petmate/petmate';
import { endActivity } from './modules/player/act';
import { ActiveBuff } from './types/buff';
import { MAX_WISHES_STORE_NUM } from './constant';
import { Wish } from './types/wish';
import { Item } from './types/item';
import { buyItem } from './modules/player/basic';

/**
 * 初始化加载玩家数据
 * 会检查每一个petmate的Buff是否过期，如果过期了则删除，如果没过期则设置一个定时器
 * 会检查每一个petmate的活动是否完成，如果完成了则结束活动并结算奖励，如果没完成则设置一个定时器
 * 会检查每一个petmate的心愿信息的数量是否超过了支持的最大心愿数量，如果超过了则按照心愿的开始时间，将之前的心愿删除
 * 会同步文件中的数据
 * @returns 加载玩家数据成功或失败，如果失败会返回一个code=400的响应，如果成功会返回一个code=200的响应，并且返回玩家信息
 */
ipcMain.handle("load-player-data", (event: IpcMainInvokeEvent): Response<PlayerInfo> => {
    try {
        const playerInfo:PlayerInfo = playerManager.getPlayer();
        const petmates: PetMate[] = playerInfo.petmates;
        // 检查每一个petmate的Buff是否过期
        petmates.forEach(petmate => {
            const allActiveBuffs: ActiveBuff[] = petmate.getActiveBuffs();
            allActiveBuffs.forEach(activeBuff => {
                // 如果已经过期了那就直接删除，没过期的那就继续设置一个定时器
                if (activeBuff.endTime < new Date()) {
                    petmate.removeBuff(activeBuff.id);
                } else {
                    const remainedTime: Date = new Date(activeBuff.endTime.getTime() - new Date().getTime());
                    setTimeout(() => {
                        petmate.removeBuff(activeBuff.id);
                    }, remainedTime.getTime());
                }
            })
        })
        
        // 检查活动是否完成
        petmates.forEach(petmate => {
            // 如果在活动中，先查看一下是否完成了活动（玩家会开始活动然后又退出游戏）
            if (petmate.status.status !== "idle") {
                const currentTime: Date = new Date();
                /**
                 * 结束活动
                 * 如果活动已经结束，则结束活动结算奖励并且同步petmate状态
                 * 如果活动还没结束，则开启延迟任务
                 */
                if (currentTime >= (petmate.status.endTime ?? new Date())) {
                    const endSuccess: boolean = endActivity(petmate.id);
                    if (endSuccess) {
                        logger.info("初始化玩家数据时，结束早已结束的活动成功。")
                    } else {
                        throw new Error("结束活动失败");
                    }
                } else {
                    if (petmate.status.endTime) {
                        const remainedTime: Date = new Date(petmate.status.endTime.getTime() - currentTime.getTime());
                        // 开启延迟任务
                        setTimeout(() => {
                            const endSuccess: boolean = endActivity(petmate.id);
                            if (endSuccess) {
                                logger.info("初始化玩家数据时，结束早已结束的活动成功。")
                            } else {
                                throw new Error("结束活动失败");
                            }
                        }, remainedTime.getTime());
                    }
                }
            }
        })

        // 检查petmate的心愿信息的数量是否超过了支持的最大心愿数量
        petmates.forEach(petmate => {
            // 如果超过了，则按照心愿的开始时间，将之前的心愿删除
            if (petmate.wishes.length > MAX_WISHES_STORE_NUM) {
                const toDeleteWishesNum: number = petmate.wishes.length - MAX_WISHES_STORE_NUM;
                const sortedWishes: Wish[] = petmate.wishes.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
                const toDeleteWishes: Wish[] = sortedWishes.slice(0, toDeleteWishesNum);
                toDeleteWishes.forEach(wish => {
                    petmate.removeWish(wish.id);
                })
            }
        })

        // 同步文件操作
        petmates.forEach(petmate => {
            playerManager.updatePetmate(petmate);
        })
        
        return {
            code: 200,
            data: playerInfo
        } as Response<PlayerInfo>;   
    } catch (error) {
        logger.error(`加载玩家数据失败: ${error}`);
        return {
            code: 400,
            message: "加载数据失败"
        } as Response<PlayerInfo>;
    }
})

/**
 * 消耗物品
 * @param itemId 物品id
 * @param count 消耗数量
 * @param petmateId petmate的id
 * @returns 消耗物品成功或失败
 */
ipcMain.handle("consume-item", (event: IpcMainInvokeEvent, itemId: number, count: number, petmateId: number): Response<void> => {
    try {
        consumeItem(itemId, count, petmateId);
        return {
            code: 200,
            message: "消耗物品成功"
        } as Response<void>;
    } catch (error) {
        logger.error(`消耗物品失败: ${error}`);
        return {
            code: 400,
            message: "消耗物品失败"
        } as Response<void>;
    }
})

/**
 * 购买物品
 * @param itemId 物品id
 * @param count 购买数量
 * @returns 购买的物品
 */
ipcMain.handle("buy-item", (event: IpcMainInvokeEvent, itemId: number, count: number): Response<Item> => {
    try {
        const item: Item = buyItem(itemId, count);
        return {
            code: 200,
            message: "购买物品成功",
            data: item
        } as Response<Item>;
    } catch (error) {
        logger.error(`购买物品失败: ${error}`);
        return {
            code: 400,
            message: "购买物品失败"
        } as Response<Item>;
    }
})