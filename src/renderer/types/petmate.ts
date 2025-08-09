import { ActivityInfo } from "./common";
import { Wish } from "./common";
import { ActiveBuff } from "./common";

export interface PetMate {
    id: number;
    name: string;
    attrs: PetMateAttribute;
    status: PetMateStatus;
    wishes: Wish[];
    completedWishesNum: number;
}


export interface PetMateAttribute {
    // 所有等级
    level: number,
    exp: number,
    nextExp: number,
    gameLevel: number,
    gameExp: number,
    gameNextExp: number,
    singLevel: number,
    singExp: number,
    singNextExp: number,
    drawLevel: number,
    drawExp: number,
    drawNextExp: number,
    affectionLevel: number,
    affectionExp: number,
    affectionNextExp: number,

    // 所有属性
    hungry: number,
    emotion: number,
    energy: number,
    health: number,

    maxHungry: number,
    maxEmotion: number,
    maxEnergy: number,
    maxHealth: number,

    buffs: ActiveBuff[],
    maxBuffs: number
}

export interface PetMateStatus {
    status: "idle" | "finished" | ActivityInfo["type"];
    startTime?: Date;
    endTime?: Date;
    activity?: ActivityInfo;
}
