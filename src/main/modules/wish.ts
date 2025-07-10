import { Wish } from "../types/wish";
import { PetMate } from "./petmate/petmate";
import { v4 as uuidv4 } from 'uuid';
import { PlayerInfo } from "../types/player";
import logger from "../log";
import { buffManager, itemManager } from "./store";
import { Buff } from "../types/buff";
import { Item } from "../types/item";
import { NotFoundError } from "../error";

type PlayerGiveItemEvent = {
    type: "item",
    id: number,
    count: number
}

type PlayerBringPetmateTakePartActEvent = {
    type: "act",
    id: number
}


/**
 * 愿望处理类
 * 负责处理愿望的生成，根据事件实时更新愿望的进度和状态，并给予奖励。
 */
class WishHandler {
    
    /**
     * 生成愿望(临时)
     * @returns 生成的愿望
     */
    generateWish(): Wish {
        return {
            id: uuidv4(),
            name: "愿望",
            status: "doing",
            startTime: new Date(),
            duration: 1000,
            endTime: new Date(Date.now() + 1000),
            affectionExp: 100,
            requirements: [],
            reward: {
                type: "item",
                id: 1,
                count: 1
            }
        }
    }

    /**
     * 更新愿望
     * 对于每一个可能可以完成愿望的操作而言，最后都应该尝试更新一下petmate的愿望，但不会同步到文件中，因此需要确保外部有同步文件的执行逻辑，否则可能导致数据丢失。
     * 该方法只是判断愿望是否能够在发生事件后能否完成，并不会为玩家或者玩家所属的petmate给予任何奖励和经验加成等，因此还需要调用者调用WishHandler中的giveReward方法给予奖励
     * 原则上而言，只能同时最多传入一个事件而不可同时传入两个事件。如果不传入事件，则会将petmate.wishes中的愿望状态更新为失败，然后返回一个空的数组。
     * @param petmate 要更新愿望的petmate
     * @returns 完成的愿望数组
     */
    updatePetmateWish(petmate: PetMate, playerGiveItemEvent?: PlayerGiveItemEvent, playerBringPetmateTakePartActEvent?: PlayerBringPetmateTakePartActEvent): Wish[] {
        let finishedWishes: Wish[] = [];
        const now = new Date();
        const toUpdateWishes: Wish[] = petmate.wishes
        // 如果没有传入事件，则直接判断哪些是过期的然后直接返回[]
        if (!playerGiveItemEvent && !playerBringPetmateTakePartActEvent) {
            toUpdateWishes.forEach(wish => {
                if (wish.endTime < now && wish.status === "doing") {
                    wish.status = "failed";
                }
            });
            petmate.wishes = toUpdateWishes;
        } else {
            if (playerGiveItemEvent) {
                toUpdateWishes.forEach(wish => {
                    // 如果愿望还没结束，则先更新一下玩家给的物品数量，然后判断是否完成了这个愿望
                    if (wish.endTime >= now && wish.status === "doing") {
                        wish.requirements.forEach(requirement => {
                            if (requirement.type === "item" && requirement.id === playerGiveItemEvent.id) {
                                requirement.userCount += playerGiveItemEvent.count;
                                // 如果玩家给的物品+原来给的物品数量大于等于要求的数量，则这个要求就算完成了
                                if (requirement.userCount >= requirement.count) {
                                    requirement.status = "finished";
                                }
                            }
                        })
                    }
                })
            }
            
            if (playerBringPetmateTakePartActEvent) {
                toUpdateWishes.forEach(wish => {
                    // 如果愿望还没结束，则先更新一下活动的状态，再判断是否完成了这个愿望
                    if (wish.endTime >= now && wish.status === "doing") {
                        wish.requirements.forEach(requirement => {
                            if (requirement.type === "act" && requirement.id === playerBringPetmateTakePartActEvent.id) {
                                requirement.status = "finished";
                            }
                        })
                    }
                })
            }
            
            // 检查一下每个愿望的requirements是否都被满足，如果是的话，这个愿望就算完成了
            toUpdateWishes.forEach(wish => {
                if (wish.endTime >= now && wish.status === "doing") {
                    let allFinished = true;
                    wish.requirements.forEach(requirement => {
                        if (requirement.status !== "finished") {
                            allFinished = false;
                        }
                    })
                    if (allFinished) {
                        wish.status = "finished";
                        finishedWishes.push(wish);
                        // 如果愿望完成，则增加完成该Petmate的愿望的数量
                        petmate.completedWishesNum++;
                    }
                }
            })

            // 更新一下petmate的愿望状态
            petmate.wishes = toUpdateWishes;
        }

        return finishedWishes;
    }

    /**
     * 给予奖励
     * 对于传入的finishedWishes，首先判断其内的愿望是否已经完成，如果已经完成，则会给予玩家和玩家所属的petmate奖励
     * 该方法不会同步到文件中，因此需要确保外部有同步文件的执行逻辑，否则可能导致数据丢失。
     * @returns 是否成功给予奖励
     * @throws 如果传入的finishedWishes中的愿望的奖励存在未找到的buff，则抛出NotFoundError
     */
    giveReward(petmate: PetMate, player:PlayerInfo, finishedWishes: Wish[]): boolean {
        finishedWishes.forEach(wish => {
            if (wish.status !== "finished") {
                logger.error(`[modules/wish.ts/giveReward] 传入的finishedWishes中存在未完成的愿望: ${wish.name}`);
                return false;
            }
        });

        finishedWishes.forEach(wish => {
            petmate.addAffectionExp(wish.affectionExp);
            if (wish.reward) {
                if (wish.reward.type === "item") {
                    const itemID: number = wish.reward.id;
                    const rewardCount: number = wish.reward.count;
                    let rewardItemExist: boolean = false;
                    // 如果背包中存在这个物品，则将这个物品的数量增加
                    player.items.forEach(item => {
                        if (item.id === itemID) {
                            item.count += rewardCount;
                            rewardItemExist = true;
                        }
                    })
                    // 如果背包中不存在这个物品，则将这个物品加入到背包中
                    if (!rewardItemExist) {
                        const rewardItem: Item | undefined = itemManager.getItem(itemID);
                        if (!rewardItem) {
                            logger.error(`[modules/wish.ts/giveReward] 传入的finishedWishes中的奖励存在未找到的物品: ${itemID} | 愿望的名字：${wish.name}`);
                            return false;
                        }
                        player.items.push({
                            id: itemID,
                            name: rewardItem.name,
                            type: rewardItem.type,
                            description: rewardItem.description,
                            url: rewardItem.url,
                            count: rewardCount,
                        })
                    }
                } else if (wish.reward.type === "buff") {
                    const buff:Buff | undefined = buffManager.getBuff(wish.reward.id);
                    if (!buff) {
                        throw new NotFoundError(`[modules/wish.ts/giveReward] 传入的finishedWishes中的奖励存在未找到的buff: ${wish.reward.id} | 愿望的名字：${wish.name}`);
                    }
                    petmate.addBuff(buff);
                }
            }
        });
        return true;
    }
}


export const wishHandler = new WishHandler();