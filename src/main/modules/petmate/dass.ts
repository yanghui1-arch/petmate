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
    next_exp: 100,
    game_level: 1,
    game_exp: 0,
    game_next_exp: 100,
    sing_level: 1,
    sing_exp: 0,
    sing_next_exp: 100,
    draw_level: 1,
    draw_exp: 0,
    draw_next_exp: 100,
    affection_level: 1,
    affection_exp: 0,
    affection_next_exp: 100,
    hungry: 100,
    emotion: 100,
    energy: 100,
    health: 100,
    max_hungry: 100,
    max_emotion: 100,
    max_energy: 100,
    max_health: 100,
    buffs: [],
    max_buffs: 10
}