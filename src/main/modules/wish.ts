import { Wish } from "../types/wish";
import { PetMate } from "./petmate/petmate";
import { v4 as uuidv4 } from 'uuid';
import { PlayerInfo } from "../types/player";
import logger from "../log";
import { buffManager, itemManager, prefabWishManager, playerManager } from "./store";
import { Buff } from "../types/buff";
import { Item } from "../types/item";
import { NotFoundError } from "../error";
import { handleFiftyAffectionAchievement } from "./player/achieve";

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
        const id = uuidv4();
        const now = new Date();
        const idx = Math.floor(Math.random() * prefabWishManager.getAllPrefabWishes().length);
        const prefabWish = prefabWishManager.getAllPrefabWishes()[idx];
        const endTime = new Date(now.getTime() + prefabWish.duration * 1000);

        return {
            id,
            name: prefabWish.name,
            status: "doing",
            startTime: now,
            duration: prefabWish.duration,
            endTime,
            affectionExp: prefabWish.affectionExp,
            requirements: prefabWish.requirements,
            reward: prefabWish.reward,
        }
    }

    /**
     * 更新愿望
     * 对于每一个可能可以完成愿望的操作而言，最后都应该尝试更新一下petmate的愿望，但不会同步到文件中，因此需要确保外部有同步文件的执行逻辑，否则可能导致数据丢失。
     * 该方法只是判断愿望是否能够在发生事件后能否完成，并不会为玩家或者玩家所属的petmate给予任何奖励和经验加成等，因此还需要调用者调用WishHandler中的claimWishReward方法给予奖励
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
            // completedWishesNum在领取奖励时更新
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
                    }
                }
            })

            // 更新一下petmate的愿望状态
            petmate.wishes = toUpdateWishes;
        }

        return finishedWishes;
    }

    /**
     * 手动领取奖励
     * 对于传入的finishedWish，首先判断其状态是否为finished，如果是，则会给予玩家和petmate奖励并将状态设置为claimed
     * 该方法会同步到文件中
     * @param petmate 相关的petmate
     * @param player 玩家信息
     * @param wishId 要领取的愿望ID
     * @returns 是否成功给予奖励
     * @throws 如果愿望未找到或状态不正确或奖励物品未找到则抛出错误
     */
    claimWishReward(petmate: PetMate, player: PlayerInfo, wishId: string): boolean {
        const wish = petmate.wishes.find(w => w.id === wishId);
        if (!wish) {
            throw new NotFoundError(`[modules/wish.ts/claimWishReward] 未找到愿望: ${wishId}`);
        }

        if (wish.status !== "finished") {
            throw new Error(`[modules/wish.ts/claimWishReward] 愿望状态不正确，无法领取奖励: ${wish.status}`);
        }

        // 给予好感度
        petmate.addAffectionExp(wish.affectionExp);

        // 给予奖励
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
                        throw new NotFoundError(`[modules/wish.ts/claimWishReward] 奖励物品未找到: ${itemID} | 愿望：${wish.name}`);
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
                const buff: Buff | undefined = buffManager.getBuff(wish.reward.id);
                if (!buff) {
                    throw new NotFoundError(`[modules/wish.ts/claimWishReward] 奖励buff未找到: ${wish.reward.id} | 愿望：${wish.name}`);
                }
                petmate.addBuff(buff);
            }
        }

        // 标记为已领取
        wish.status = "claimed";
        petmate.completedWishesNum++;

        // 更新数据
        playerManager.updatePetmate(petmate);
        playerManager.updatePlayer(player);

        // 更新好感度成就
        handleFiftyAffectionAchievement(petmate.attrs.affectionExp);

        return true;
    }

    /**
     * 清理旧愿望
     * 删除超过指定天数的愿望（无论状态如何）
     * @param petmate 相关的petmate
     * @param daysToKeep 保留最近几天的愿望
     */
    cleanupOldWishes(petmate: PetMate, daysToKeep: number = 3): number {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - (daysToKeep * 24 * 60 * 60 * 1000));

        const originalCount = petmate.wishes.length;
        petmate.wishes = petmate.wishes.filter(wish => wish.startTime >= cutoffTime);
        const removedCount = originalCount - petmate.wishes.length;

        if (removedCount > 0) {
            logger.info(`[modules/wish.ts/cleanupOldWishes] 为 ${petmate.name} 清理了 ${removedCount} 个旧愿望`);
        }

        return removedCount;
    }
}


export const wishHandler = new WishHandler();
