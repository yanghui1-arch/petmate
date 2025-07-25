import { ItemEffect } from "../types/common";
const effectMap = {
    hungry: "饱食度",
    energy: "精力",
    emotion: "心情",
    health: "健康",
    cash: "金币",
    exp: "经验",
    gameExp: "游戏经验",
    singExp: "唱歌经验",
    drawExp: "绘画经验",
    affectionExp: "亲密度经验",
    level: "Lv.",
    sing_level: "唱歌Lv.",
    draw_level: "绘画Lv.",
    game_level: "游戏Lv.",
    affection_level: "亲密度Lv.",
}

/**
 * 转换活动效果为中文
 * @param effect 效果
 * @returns 效果名称
 */
export function convertActivityEffect(effect: string) {
    return effectMap[effect as keyof typeof effectMap]
}

/**
 * 计算活动时间
 * @param spendingTime 活动时间 单位：秒
 * @returns 活动时间 单位：时+分+秒
 */
export function computeActivityTime(spendingTime: number) {
    const hours = Math.floor(spendingTime / 3600)
    const minutes = Math.floor((spendingTime % 3600) / 60)
    const seconds = Math.floor(spendingTime % 60)
    let computedTime = ""
    if (seconds > 0) {
        computedTime = seconds + "秒"
    }
    if (minutes > 0) {
        computedTime = minutes + "分" + computedTime
    }
    if (hours > 0) {
        computedTime = hours + "时" + computedTime
    }
    return computedTime
}

