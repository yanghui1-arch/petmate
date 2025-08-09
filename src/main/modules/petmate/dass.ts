import { PetMateAttribute, PetMateStatus } from "../../types/petmate";
import { PetMate } from "./petmate";
import { Wish } from "../../types/wish";

/**
 * Dass
 * 继承Petmate，基本的属性增删不需要写，主要写动作
 */
export class Dass extends PetMate {
    constructor(id:number, name:string, attrs: PetMateAttribute, status: PetMateStatus, wishes: Wish[], completedWishesNum: number) {
        super(id, name, attrs, status, wishes, completedWishesNum);
    }
}

/**
 * Dass的默认属性
 */
export const DEFAULT_DASS_ATTRIBUTE: PetMateAttribute = {
    level: 1,
    exp: 0,
    nextExp: 100,
    gameLevel: 1,
    gameExp: 0,
    gameNextExp: 100,
    singLevel: 1,
    singExp: 0,
    singNextExp: 100,
    drawLevel: 1,
    drawExp: 0,
    drawNextExp: 100,
    affectionLevel: 1,
    affectionExp: 0,
    affectionNextExp: 100,
    hungry: 100,
    emotion: 100,
    energy: 100,
    health: 100,
    maxHungry: 100,
    maxEmotion: 100,
    maxEnergy: 100,
    maxHealth: 100,
    buffs: [],
    maxBuffs: 10
}
