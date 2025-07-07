import { Buff } from "./buff";

export type ItemType = "food" | "drink" | "drug" | "gift" | "blackMarket"

export type Item = {
    id: number,
    name: string,
    url: string,
    type: ItemType,
    price: number,
    effect: ItemEffect,
    description: string
}

export type ItemEffect = {
    hungry: number,
    emotion: number,
    energy: number,
    health: number,
    exp?: number,
    gameExp?: number,
    singExp?: number,
    drawExp?: number,
    affectionExp?: number,
    cash?: number,
    buff?: Buff,
}