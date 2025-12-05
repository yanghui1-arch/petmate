import { Buff } from "./buff";
import { Requirement } from "./common";

export type ItemType = "food" | "drink" | "medicine" | "gift" | "limit" | "others"

export type Item = {
    id: number,
    name: string,
    requirement: Requirement
    url: string,
    type: ItemType,
    price: number,
    effect: ItemEffect,
    description: string,
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
