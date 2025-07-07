import { itemManager } from "../store";
import { NotEnoughError, NotFoundError } from "../../error";
import { playerManager } from "../store";
import { PetMate } from "../petmate/petmate";
import { PlayerInfo } from "../../types/player";
import { Buff } from "../../types/buff";

/**
 * 使用物品
 * @param itemId 物品id
 * @param count 使用数量
 * @param petmateId petmate的id
 * @throws 如果物品不存在或者petmate不存在则抛出NotFoundError
 * @throws 如果petmate的属性不够则抛出NotEnoughError
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
    
    // 同步文件中的数据
    player.items.set(itemId, playerItemNum - count);
    playerManager.updatePlayer(player);
    playerManager.updatePetmate(petmate);
}