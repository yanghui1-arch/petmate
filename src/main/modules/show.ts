import { getPrimaryItemType, ItemType } from "../types/item";
import { Item } from "../types/item";
import { itemManager } from "./store";
import { PetMate } from "./petmate/petmate";
import { ActivityInfo } from "../types/activity";
import { activityManager } from "./store";

/**
 * 根据商品类型展示黑市中的所有物品
 * @param type 商品类型
 * @returns 对应商品类型的商品列表
 */
export function showItems(type: ItemType): Item[] {
    const items: Item[] = itemManager.getAllItems();
    return items.filter(item => getPrimaryItemType(item.type) === type);
}

/**
 * 根据物品id获取物品信息
 * @param itemIds 物品id列表
 * @returns 物品信息列表
 */
export function getItemInfo(itemIds: number[]): Item[] {
    const items: Item[] = [];
    itemIds.forEach(itemId => {
        const item: Item | undefined = itemManager.getItem(itemId);
        if (item) {
            items.push(item);
        }
    })
    return items;
}

/**
 * 获得完成此Petmate的愿望数量
 */
export function getCompletedWishesNum(petmate: PetMate): number {
    return petmate.getCompletedWishesNum();
}

/**
 * 根据活动类别获取该类型的所有活动
 * @param type 活动类别
 * @returns 该类型的所有活动
 */
export function showActivities(type: ActivityInfo["type"]): ActivityInfo[] {
    const activities: ActivityInfo[] = activityManager.getAllActivities();
    return activities.filter(activity => activity.type === type);
}
