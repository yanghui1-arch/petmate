
// 物品
export type ItemType = "food" | "drink" | "medicine" | "gift" | "limit" | "others"
export interface Item {
    id: number,
    name: string,
    url: string,
    type: ItemType,
    price: number,
    effect: ItemEffect,
    description: string,
    requirement: Requirement
}

export interface ItemEffect {
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

// 心愿
export interface Wish {
    id: string,
    name: string,
    requirements: WishRequirement[],
    affectionExp: number,
    reward?: WishReward,
    startTime: Date,
    duration: number,
    endTime: Date,
    status: "doing" | "finished" | "claimed" | "failed" // 进行中，已完成（未领取），已领取，已失败
}

export type WishRequirement = {
    type: "item",
    id: number,
    name: string,
    src: string,
    count: number,
    userCount: number,
    status: "doing" | "finished"
} | {
    type: "act",
    id: number,
    name: string,
    src: string,
    status: "doing" | "finished"
}

export type WishReward = {
    type: "item",
    id: number,
    name: string,
    src: string,
    count: number,
} | {
    type: "buff",
    id: number,
    name: string,
    src: string,
}

/**
 * Buff效果类型定义
 * rate为1时表示无影响
 * rate > 1 表示增益
 * rate < 1 表示减益
 */
export interface Buff {
    id: number;
    name: string;
    description: string;
    icon: string;
    type: "positive" | "negative";
    duration: number;  // 持续时间（秒）
    effect: BuffEffect;
    maxStack: number;  // 最大叠加层数
}

export interface BuffEffect {
    // 经验获取相关
    expGainRate: number;            // 经验获取倍率
    gameExpGainRate: number;        // 游戏经验获取倍率
    singExpGainRate: number;        // 唱歌经验获取倍率
    drawExpGainRate: number;        // 画画经验获取倍率
    affectionExpGainRate: number;   // 亲密度经验获取倍率

    // 属性消耗相关
    energyCostRate: number;         // 精力消耗倍率
    hungryCostRate: number;         // 饱食度消耗倍率
    healthCostRate: number;         // 健康消耗倍率
    emotionCostRate: number;        // 心情消耗倍率
    cashCostRate: number;           // 金币消耗倍率

    // 属性获取相关
    energyGainRate: number;         // 精力恢复倍率
    hungryGainRate: number;         // 饱食度恢复倍率
    healthGainRate: number;         // 健康恢复倍率
    emotionGainRate: number;        // 心情恢复倍率

    // 其他效果
    spendingTimeRate: number;       // 消耗时间倍率
    cashGainRate: number;           // 金币获取倍率
}

export interface ActiveBuff {
    id: string;
    buff: Buff;
    endTime: Date;
}


// 活动
export interface ActivityInfo {
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

export interface Reward {
    exp: number;
    gameExp: number;
    singExp: number;
    drawExp: number;
    affectionExp: number;
    energy: number;
    hungry: number;
    health: number;
    emotion: number;
    cash: number;
}

export interface Consume {
    energy?: number;
    hungry?: number;
    health?: number;
    emotion?: number;
    cash?: number;
    spendingTime: number; // seconds
}

export interface Requirement {
    level?: number,
    singLevel?: number,
    drawLevel?: number,
    gameLevel?: number,
    affectionLevel?: number,
}
