import { NotEnoughError, NotFoundError } from "../../error";
import { activityManager, playerManager } from "../store";
import { PetMate } from "../petmate/petmate";
import { calcBuffEffect } from "../utils/calc";
import { BuffEffect } from "../../types/buff";
import logger from "../../log";
import { ActivityInfo, Reward } from "../../types/activity";
import { notActivityPetmateStatus } from "../../types/petmate";

/**
 * 开始活动
 * @param petmateId petmate的id
 * @param activityId 活动的id
 * @throws 如果活动不存在则抛出NotFoundError
 * @throws 如果petmate不存在则抛出NotFoundError
 * @throws 如果能量不足则抛出NotEnoughError
 * @throws 如果饱食度不足则抛出NotEnoughError
 * @throws 如果心情不足则抛出NotEnoughError
 * @throws 如果健康不足则抛出NotEnoughError
 */
export function startActivity(petmateId: number, activityId: number) {
    const activity = activityManager.getActivity(activityId);
    if (activity === undefined) {
        throw new NotFoundError(`活动不存在: ${activityId}`);
    }
    const consume = activity.consume;
    const player = playerManager.getPlayer();
    const petmate: PetMate | undefined = player.petmates.find(petmate => petmate.id === petmateId);
    if (petmate === undefined) {
        throw new NotFoundError(`Petmate不存在: ${petmateId}`);
    }
    const buffEffect:BuffEffect = calcBuffEffect(petmate.attrs.buffs);
    try {
        petmate.updateEnergy(consume.energy);
        petmate.updateHungry(consume.hungry);
        petmate.updateEmotion(consume.emotion);
        petmate.updateHealth(consume.health);
        playerManager.updateCash(consume.cash * buffEffect.cashCostRate);
        petmate.setStatus({
            status: activity.type,
            startTime: new Date(),
            endTime: new Date(new Date().getTime() + consume.spendingTime * buffEffect.spendingTimeRate * 1000),
            activity: activity
        });
        // 启动一个延时任务，在endTime时结束活动并获得收益
        // 可能会endTime结束前关闭应用，因此一定要在打开游戏时候查一下petmate的status
        setTimeout(() => {
            endActivity(petmateId);
        }, consume.spendingTime * buffEffect.spendingTimeRate * 1000);


    } catch (error) {
        if (error instanceof NotEnoughError) {
            throw new NotEnoughError(`${error.message}`);
        }
        throw error;
    }
}

/**
 * 结束活动
 * 活动只会按照结束时的buff效果计算奖励
 * @param petmateId petmate的id
 * @returns 是否结束成功
 */
export function endActivity(petmateId: number): boolean {
    const player = playerManager.getPlayer();
    const petmate: PetMate | undefined = player.petmates.find(petmate => petmate.id === petmateId);
    if (petmate === undefined) {
        throw new NotFoundError(`Petmate不存在: ${petmateId}`);
    }
    const status = petmate.getStatus();
    if (status.status === "idle") {
        logger.warning(`Petmate [${petmateId}] 当前状态为idle，无法结束活动`);
        return false;
    }
    const activity: ActivityInfo | undefined = status.activity;
    const reward: Reward | undefined = activity?.reward;
    const buffEffect:BuffEffect = calcBuffEffect(petmate.attrs.buffs);
    // 更新奖励
    petmate.updateEnergy(reward?.energy ?? 0);
    petmate.updateHungry(reward?.hungry ?? 0);
    petmate.updateEmotion(reward?.emotion ?? 0);
    petmate.updateHealth(reward?.health ?? 0);
    petmate.addExp(reward?.exp ?? 0);
    petmate.addGameExp(reward?.gameExp ?? 0);
    petmate.addSingExp(reward?.singExp ?? 0);
    petmate.addDrawExp(reward?.drawExp ?? 0);
    petmate.addAffectionExp(reward?.affectionExp ?? 0);
    playerManager.updateCash(reward?.cash ?? 0 * buffEffect.cashGainRate);

    // 尝试获取buff

    // 结束活动
    petmate.setStatus(notActivityPetmateStatus);
    return true;
}