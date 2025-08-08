/**
 * 活动的奖励、消耗和要求 中的字段都是可选的
 * 例如：奖励中没有cash，则不会奖励现金
 * {
 *  exp: 100,
 *  gameExp: 100,
 *  singExp: 100,
 *  drawExp: 100,
 *  affectionExp: 100,
 * }
 */
import { Requirement } from "./common"

/**
 * 活动的奖励
 * 请注意这是活动带来的奖励，而不是其他地方的奖励
 * 这些number数值都必须得是正数！
 */
export type Reward = {
    exp?: number;
    gameExp?: number;
    singExp?: number;
    drawExp?: number;
    affectionExp?: number;
    energy?: number;
    hungry?: number;
    health?: number;
    emotion?: number;
    cash?: number;
}

/**
 * 活动的消耗
 * 这些number数值都必须得是正数！
 */
export type Consume = {
    energy?: number;
    hungry?: number;
    health?: number;
    emotion?: number;
    cash?: number;
    spendingTime: number; // seconds
}

export type ActivityInfo = {
    id: number;
    type: "work" | "study" | "entertainment";
    name: string;
    url: string;
    description: string;
    reward: Reward;
    consume: Consume;
    requirement: Requirement;
    rewardSummary: string; // 奖励概述
}
