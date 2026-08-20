import { PackageItemInfo } from "../types/player";
import { getItemTypes, Item, ItemTypeValue } from "../types/common";
import { i18n } from "../i18n";

const UNUSABLE_PACKAGE_ITEM_TYPES = ["ticket", "fashion"];

const EFFECT_MAP = {
    hungry: "attributes.hungry",
    energy: "attributes.energy",
    emotion: "attributes.emotion",
    health: "attributes.health",
    exp: "attributes.exp",
    gameExp: "attributes.gameExp",
    singExp: "attributes.singExp",
    drawExp: "attributes.drawExp",
    affectionExp: "attributes.affectionExp",
    cash: "attributes.cash",
} as const;

/**
 * 转换物品效果为中文
 * @param effect 效果
 * @returns 效果名称
 */
export function convertItemEffect(effect: string) {
    const messageKey = EFFECT_MAP[effect as keyof typeof EFFECT_MAP];
    return messageKey ? i18n.global.t(messageKey) : effect;
}

/**
 * 判断物品是否允许在背包中直接使用
 * @param item 物品
 * @returns 是否可以直接使用
 */
export function canUseItemFromPackage(item: { type: ItemTypeValue }) {
    return !getItemTypes(item.type).some(type => UNUSABLE_PACKAGE_ITEM_TYPES.includes(type));
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
