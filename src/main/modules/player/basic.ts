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
import { Item } from "../../types/item";
import { PlayerInfo } from "../../types/player";
import { itemManager, playerManager } from "../store"
import { PetMate } from "../petmate/petmate";
import { Buff } from "../../types/buff";
import { wishHandler } from "../wish";
import { Wish } from "../../types/wish";

/**
 * 购买物品
 * Buff的CashConsumesRate不会影响到商品的价格
 * @param itemId 物品id
 * @param count 购买数量
 * @throws 如果物品不存在则抛出NotFoundError
 */
export function buyItem(itemId: number, count: number): void {
    const player:PlayerInfo = playerManager.getPlayer();
    const playerItemNum: number = player.items.get(itemId) ?? 0;
    const item:Item | undefined = itemManager.getItem(itemId);
    if (!item) {
        throw new NotFoundError(`购买物品的时候发现物品不存在: ${itemId}`);
    }
    const totalPrice = item.price * count;
    const playerCash = player.cash;
    if (playerCash < totalPrice) {
        throw new NotEnoughError(`购买物品的时候发现玩家现金不足: 购买${count}个物品id[${itemId}]， 需要${totalPrice}元， 但是只有${playerCash}元`);
    }
    player.cash -= totalPrice;
    player.items.set(itemId, playerItemNum + count);
    playerManager.updatePlayer(player);
}

/**
 * 使用物品
 * @param itemId 物品id
 * @param count 使用数量
 * @param petmateId petmate的id
 * @throws 如果物品不存在或者petmate不存在则抛出NotFoundError
 * @throws 如果petmate的属性不够则抛出NotEnoughError
 * @throws 如果传入的finishedWishes中的愿望的奖励存在未找到的buff，则抛出NotFoundError
 */
export function consumeItem(itemId: number, count: number=1, petmateId: number): void {
    const player:PlayerInfo = playerManager.getPlayer();
    const petmate: PetMate | undefined = player.petmates.find(petmate => petmate.id === petmateId);
    if (!petmate) {
        throw new NotFoundError(`宠物不存在: ${petmateId}`);
    }
    // 检查玩家是否有这么多的物品
    const playerItemNum: number = player.items.get(itemId) ?? 0;
    if (playerItemNum < count) {
        throw new NotEnoughError(`玩家没有这么多物品: 物品id[${itemId}]， 需要${count}个， 但是只有${playerItemNum}个`);
    }
    
    const item = itemManager.getItem(itemId);
    if (!item) {
        throw new NotFoundError(`物品不存在: ${itemId}`);
    }
    
    petmate.updateHungry(item.effect.hungry * count);
    petmate.updateEmotion(item.effect.emotion * count);
    petmate.updateEnergy(item.effect.energy * count);
    petmate.updateHealth(item.effect.health * count);

    petmate.addExp(item.effect.exp ?? 0 * count);
    petmate.addGameExp(item.effect.gameExp ?? 0 * count);
    petmate.addSingExp(item.effect.singExp ?? 0 * count);
    petmate.addDrawExp(item.effect.drawExp ?? 0 * count);
    petmate.addAffectionExp(item.effect.affectionExp ?? 0 * count);
    
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
        wishHandler.giveReward(petmate, player, finishedWishes);
    }
    
    // 同步文件中的数据
    player.items.set(itemId, playerItemNum - count);
    playerManager.updatePetmate(petmate);
    playerManager.updatePlayer(player);
}