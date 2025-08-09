import { ActivityInfo } from "./activity"
import { ActiveBuff } from "./buff"

export type PetMateAttribute = {
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

export type PetMateStatus = {
    status: "idle" | "finished" | ActivityInfo["type"];
    startTime?: Date;
    endTime?: Date;
    activity?: ActivityInfo;
}

export const notActivityPetmateStatus: PetMateStatus = {
    status: "idle",
}
