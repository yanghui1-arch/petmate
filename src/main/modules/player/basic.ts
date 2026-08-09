/**
 * 玩家在游戏中所有的最最基本的且逻辑不复杂的操作
 * 参与活动由于涉及到大量运算，因此不算最基本的操作
 * 【如何判断是否是基本操作】
 *  1. 这个基本操作需要涉及到1~2个复杂的需要因此封装的步骤
 *  2. 不存在复杂的逻辑运算
 *
 * 目前包括但不限于以下操作，若有遗漏，请添加。
 * 商品系列：1. 购买商品 2. 使用物品
 * 卡片系列：1. 获得卡片
 */

import { NotEnoughError, NotFoundError } from "../../error";
import { getItemTypes, Item } from "../../types/item";
import { PackageItemInfo, PlayerInfo } from "../../types/player";
import { itemManager, playerManager } from "../store"
import { PetMate } from "../petmate/petmate";
import { Buff } from "../../types/buff";
import { wishHandler } from "../wish";
import { Wish } from "../../types/wish";
import { getMainWindow, getPageWindow } from "../../../main";
import { calcBuffEffect } from "../utils/calc";
import { handleCharacterLevelAchievement, handleFiftyAffectionAchievement, handleEmotionAchievement } from "./achieve";
import { playerResourceManager, SkinAlreadyOwnedError } from "./resource";

const UNUSABLE_PACKAGE_ITEM_TYPES = ["ticket", "fashion"];

export type PackageItemConsumeRequirement = {
    itemId: number;
    count: number;
}

/**
 * 购买物品
 * Buff的CashConsumesRate不会影响到商品的价格
 *
 * @param itemId 物品id
 * @param count 购买数量
 * @returns 购买的物品
 * @throws 如果物品不存在则抛出NotFoundError
 */
export function buyItem(itemId: number, count: number): Item {
    const player: PlayerInfo = playerManager.getPlayer();
    const item: Item | undefined = itemManager.getItem(itemId);
    if (!item) {
        throw new NotFoundError(`购买物品的时候发现物品不存在: ${itemId}`);
    }
    if (!Number.isInteger(count) || count <= 0) {
        throw new Error(`购买物品数量不合法: ${count}`);
    }
    if (item.skinId && count !== 1) {
        throw new Error("时装每次只能购买一套");
    }
    const totalPrice = item.price * count;
    const playerCash = player.cash;
    if (playerCash < totalPrice) {
        throw new NotEnoughError(`购买物品的时候发现玩家现金不足: 购买${count}个物品id[${itemId}]， 需要${totalPrice}元， 但是只有${playerCash}元`);
    }
    if (item.skinId && playerResourceManager.hasSkin(item.skinId)) {
        throw new SkinAlreadyOwnedError(item.name);
    }

    player.cash -= totalPrice;
    if (item.skinId) {
        playerResourceManager.unlockSkin(item.skinId);
        playerManager.updatePlayer(player);
        return item;
    }

    const playerItemNum: number = player.items.find(item => item.id === itemId)?.count ?? 0;
    if (playerItemNum === 0) {
        player.items.push({
            id: itemId,
            count: count,
            name: item.name,
            type: item.type,
            description: item.description,
            url: item.url
        });
    } else {
        player.items.find(item => item.id === itemId)!.count += count;
    }
    playerManager.updatePlayer(player);
    return item;
}

/**
 * 扣除背包物品，不触发物品本身效果。
 * 用于委托、兑换等“交付材料”场景，避免把 ticket 当成普通背包物品使用。
 * @param requirements 需要扣除的物品和数量
 * @throws 如果物品不存在或数量不足则抛出错误
 */
export function consumePackageItems(requirements: PackageItemConsumeRequirement[]): void {
    if (!requirements.length) {
        throw new Error("扣除背包物品失败: requirements为空");
    }

    const player: PlayerInfo = playerManager.getPlayer();

    for (const requirement of requirements) {
        if (!Number.isInteger(requirement.itemId) || !Number.isInteger(requirement.count) || requirement.count <= 0) {
            throw new Error(`扣除背包物品失败，参数不合法: ${JSON.stringify(requirement)}`);
        }

        const item: Item | undefined = itemManager.getItem(requirement.itemId);
        if (!item) {
            throw new NotFoundError(`扣除背包物品失败，物品不存在: ${requirement.itemId}`);
        }

        const packageItem: PackageItemInfo | undefined = player.items.find(item => item.id === requirement.itemId);
        if (!packageItem) {
            throw new NotFoundError(`扣除背包物品失败，背包中不存在物品: ${requirement.itemId}`);
        }

        if (packageItem.count < requirement.count) {
            throw new NotEnoughError(`扣除背包物品失败，物品数量不足: 物品id[${requirement.itemId}]，需要${requirement.count}个，但是只有${packageItem.count}个`);
        }
    }

    for (const requirement of requirements) {
        const index = player.items.findIndex(item => item.id === requirement.itemId);
        if (index === -1) continue;

        player.items[index].count -= requirement.count;
        if (player.items[index].count <= 0) {
            player.items.splice(index, 1);
        }
    }

    playerManager.updatePlayer(player);
}

/**
 * 使用物品
 * 物品的计算奖励方式是会根据现有的Petmate的buff进行结算的
 * @param itemId 物品id
 * @param count 使用数量
 * @param petmateId petmate的id
 * @throws 如果物品不存在或者petmate不存在则抛出NotFoundError
 * @throws 如果petmate的属性不够则抛出NotEnoughError
 * @throws 如果传入的finishedWishes中的愿望的奖励存在未找到的buff，则抛出NotFoundError
 */
export function consumeItem(itemId: number, count: number = 1, petmateId: number): void {
    const player: PlayerInfo = playerManager.getPlayer();
    const petmate: PetMate | undefined = player.petmates.find(petmate => petmate.id === petmateId);
    if (!petmate) {
        throw new NotFoundError(`Petmate不存在: ${petmateId}`);
    }

    // 检查玩家背包中是否有这个物品
    const consumeItemInPackage: PackageItemInfo | undefined = player.items.find(item => item.id === itemId);
    if (!consumeItemInPackage) {
        throw new NotFoundError(`玩家背包中不存在物品: ${itemId}`);
    }

    // 检查玩家是否有这么多的物品
    const playerItemNum: number = consumeItemInPackage.count
    if (playerItemNum < count) {
        throw new NotEnoughError(`玩家没有这么多物品: 物品id[${itemId}]， 需要${count}个， 但是只有${playerItemNum}个`);
    }

    const item = itemManager.getItem(itemId);
    if (!item) {
        throw new NotFoundError(`物品不存在: ${itemId}`);
    }
    if (getItemTypes(item.type).some(type => UNUSABLE_PACKAGE_ITEM_TYPES.includes(type))) {
        throw new Error(`该物品不能在背包中直接使用: ${itemId}`);
    }

    petmate.updateHungry((item.effect.hungry ?? 0) * count);
    petmate.updateEmotion((item.effect.emotion ?? 0) * count);
    petmate.updateEnergy((item.effect.energy ?? 0) * count);
    petmate.updateHealth((item.effect.health ?? 0) * count);

    petmate.addExp((item.effect.exp ?? 0) * count);
    petmate.addGameExp((item.effect.gameExp ?? 0) * count);
    petmate.addSingExp((item.effect.singExp ?? 0) * count);
    petmate.addDrawExp((item.effect.drawExp ?? 0) * count);
    petmate.addAffectionExp((item.effect.affectionExp ?? 0) * count);
    player.cash += ((item.effect.cash ?? 0) * calcBuffEffect(petmate.attrs.buffs).cashGainRate) * count;

    const toAddBuff: Buff | undefined = item.effect.buff;
    if (toAddBuff) {
        petmate.addBuff(toAddBuff);
    }
    const finishedWishes: Wish[] = wishHandler.updatePetmateWish(petmate, {
        type: "item",
        id: itemId,
        count: count
    }, undefined);
    if (finishedWishes.length > 0) {
        // 心愿完成，发送消息给渲染层（但不自动给奖励）
        const mainWindow = getMainWindow();
        const pageWindow = getPageWindow();
        const finishedWishNames: string[] = finishedWishes.map(wish => wish.name);
        if (mainWindow) {
            mainWindow.webContents.send('wish-finished', petmateId, finishedWishNames);
        }
        if (pageWindow) {
            pageWindow.webContents.send('wish-finished', petmateId, finishedWishNames);
        }
    }

    // 更新背包中的物品数量
    const idx = player.items.findIndex(item => item.id === itemId);
    if (idx !== -1) {
        const packageItem = player.items[idx];
        packageItem.count -= count;
        if (packageItem.count <= 0) {
            player.items.splice(idx, 1);
        }
    }

    // 同步文件中的数据
    playerManager.updatePetmate(petmate);
    playerManager.updatePlayer(player);

    // 更新等级成就
    handleCharacterLevelAchievement(petmate.attrs.level);
    // 更新好感度成就
    handleFiftyAffectionAchievement(petmate.attrs.affectionExp);
    // 更新心情成就
    handleEmotionAchievement(petmate.attrs.emotion);
}
