import { ActiveBuff } from "./buff"

export type PetMateAttribute = {
    id: number,
    name: String,
    // 所有等级
    level: number,
    exp: number,
    next_exp: number,
    game_level: number,
    game_exp: number,
    game_next_exp: number,
    sing_level: number,
    sing_exp: number,
    sing_next_exp: number,
    draw_level: number,
    draw_exp: number,
    draw_next_exp: number,
    affection_level: number,
    affection_exp: number,
    affection_next_exp: number,

    // 所有属性
    hungry: number,
    emotion: number,
    energy: number,
    health: number,

    max_hungry: number,
    max_emotion: number,
    max_energy: number,
    max_health: number,

    buffs: ActiveBuff[]
}