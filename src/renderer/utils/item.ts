import { PackageItemInfo } from "../types/player";
import { Item } from "../types/common";

const EFFECT_MAP = {
    hungry: "饱食度",
    energy: "精力",
    emotion: "心情",
    health: "健康",
}

/**
 * 转换物品效果为中文
 * @param effect 效果
 * @returns 效果名称
 */
export function convertItemEffect(effect: string) {
    return EFFECT_MAP[effect as keyof typeof EFFECT_MAP]
}

/**
 * 背包物品分页
 * @param itemList 背包物品信息列表
 * @param pageSize 每页物品数量
 * @returns 二级列表，每个元素是一个数组，数组中是每页的物品
 */
export function executePackageItemPage(itemList: PackageItemInfo[], pageSize: number): PackageItemInfo[][] {
    const pageNum = Math.ceil(itemList.length / pageSize);
    const pageList: PackageItemInfo[][] = [];
    for (let i = 0; i < pageNum; i++) {
        const start = i * pageSize;
        const end = start + pageSize;
        pageList.push(itemList.slice(start, end));
    }
    return pageList.length ? pageList : [[]];
}


/**
 * 黑市商品分页
 * @param itemList 黑市商品信息列表
 * @param pageSize 每页商品数量
 * @returns 二级列表，每个元素是一个数组，数组中是每页的商品
 */
export function executeItemPage(itemList: Item[], pageSize: number): Item[][] {
    const pageNum = Math.ceil(itemList.length / pageSize);
    const pageList: Item[][] = [];
    for (let i = 0; i < pageNum; i++) {
        const start = i * pageSize;
        const end = start + pageSize;
        pageList.push(itemList.slice(start, end));
    }
    return pageList.length ? pageList : [[]];
}
