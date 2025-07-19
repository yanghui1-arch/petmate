import { ItemEffect } from "../types/common";
const effectMap = {
    hungry: "饱食度",
    energy: "精力",
    emotion: "心情",
    health: "健康",
}


/**
 * 物品分页
 * @param itemList 物品列表
 * @param pageSize 每页商品数量
 * @returns 嵌套列表，每个元素是一个数组，数组中是每页的物品
 */
export function executeItemPage(itemList: any[], pageSize: number) {
    const pageNum = Math.ceil(itemList.length / pageSize);
    const pageList = [];
    for (let i = 0; i < pageNum; i++) {
        const start = i * pageSize;
        const end = start + pageSize;
        pageList.push(itemList.slice(start, end));
    }
    return pageList.length ? pageList : [[]];
}

export function convertItemEffect(effect: string) {
    return effectMap[effect as keyof typeof effectMap]
}