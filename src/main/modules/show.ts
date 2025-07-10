import { ItemType } from "../types/item";
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
    return items.filter(item => item.type === type);
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