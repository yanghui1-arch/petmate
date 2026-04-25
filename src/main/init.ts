import { ActiveBuff } from "./types/buff";
import { PlayerInfo } from "./types/player";
import logger from "./log";
import { PetMate } from "./modules/petmate/petmate";
import { finishActivity } from "./modules/player/act";
import { wishHandler } from "./modules/wish";
import { activityManager, buffManager, itemManager, playerManager, prefabWishManager } from './modules/store'
import { greenworksManager } from './greenworks'
import { initSettings } from "./settings";
import { app } from "electron";
import { DAYS_TO_KEEP_WISH } from "./constant";

export function appInit(): void {
    console.log("开始初始化app")
    console.log("开始初始化greenworks...")
    const initResult = greenworksManager.init()
    if (initResult === false) {
        app.quit()
        return
    }
    console.log(`初始化greenworks成功！`)
    const steamID: string = greenworksManager.getSteamInfo().steamId

    // init store
    initSettings()
    itemManager.initItem()
    playerManager.initPlayer(steamID)
    activityManager.initActivity()
    buffManager.initBuff()
    prefabWishManager.initPrefabWish()

    // 初始化玩家数据的状态
    initPlayerDataStatus()
}

/**
 * 初始化玩家数据
 * 该方法只能在app开始的时候调用一次，不能在别的地方再次被调用，如果只要获取玩家最新的数据，请调用ipc.ts/get-current-player-data
 * 会检查每一个petmate的Buff是否过期，如果过期了则删除，如果没过期则设置一个定时器
 * 会检查每一个petmate的活动是否完成，如果完成了则结束活动并结算奖励，如果没完成则设置一个定时器
 * 会检查每一个petmate的心愿信息的数量是否超过了支持的最大心愿数量，如果超过了则按照心愿的开始时间，将之前的心愿删除
 * 会同步文件中的数据
 */
function initPlayerDataStatus(): void {
    try {
        console.log("开始初始化玩家数据的状态...")
        const playerInfo: PlayerInfo = playerManager.getPlayer();
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
            if (petmate.status.status !== "idle" && petmate.status.status !== "finished") {
                const currentTime: Date = new Date();
                /**
                 * 检查活动是否已完成
                 * 如果活动已经完成，则设置为可领取状态
                 * 如果活动还没完成，则开启延迟任务
                 */
                if (currentTime >= (petmate.status.endTime ?? new Date())) {
                    // 设置状态为可领取
                    petmate.setStatus({
                        ...petmate.status,
                        status: "finished"
                    });
                    playerManager.updatePetmate(petmate);
                    logger.info("初始化玩家数据时，将已完成的活动设置为可领取状态。")
                } else {
                    if (petmate.status.endTime) {
                        const remainedTime: Date = new Date(petmate.status.endTime.getTime() - currentTime.getTime());
                        // 开启延迟任务，活动完成时设置为可领取状态
                        setTimeout(() => {
                            finishActivity(petmate.id);
                        }, remainedTime.getTime());
                    }
                }
            }
        })

        // 检查petmate的心愿信息的数量是否超过了支持的最大心愿数量
        petmates.forEach(petmate => {
            // 首先清理超过DAYS_TO_KEEP_WISH天的旧愿望
            wishHandler.cleanupOldWishes(petmate, DAYS_TO_KEEP_WISH);
        })

        // 同步文件操作
        petmates.forEach(petmate => {
            playerManager.updatePetmate(petmate);
        })

        console.log("初始化玩家数据的状态完成！")

    } catch (error) {
        logger.error(`初始化玩家数据失败: ${error}`);
        console.log("初始化玩家数据失败:", error)
    }
}
