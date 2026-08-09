import { Buff } from "./buff";
import { Requirement } from "./common";

export type ItemType = "food" | "drink" | "medicine" | "gift" | "limit" | "ticket" | "fashion" | "others"
export type ItemTypeValue = ItemType | readonly ItemType[]

export function getItemTypes(type: ItemTypeValue): readonly ItemType[] {
    return typeof type === "string" ? [type] : type
}

export function getPrimaryItemType(type: ItemTypeValue): ItemType {
    return getItemTypes(type)[0] ?? "others"
}

export function itemHasType(item: { type: ItemTypeValue }, type: ItemType): boolean {
    return getItemTypes(item.type).includes(type)
}

export type Item = {
    id: number,
    name: string,
    requirement: Requirement
    url: string,
    type: ItemTypeValue,
    price: number,
    effect: ItemEffect,
    description: string,
    skinId?: string,
    expired?: boolean,
}

export type ItemEffect = {
    hungry?: number,
    emotion?: number,
    energy?: number,
    health?: number,
    exp?: number,
    gameExp?: number,
    singExp?: number,
    drawExp?: number,
    affectionExp?: number,
    cash?: number,
    buff?: Buff,
}
