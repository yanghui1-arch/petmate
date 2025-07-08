import { NotEnoughError, NotFoundError } from "../../error";
import { Item } from "../../types/item";
import { PlayerInfo } from "../../types/player";
import { itemManager, playerManager } from "../store"

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