/**
 * Buff效果类型定义
 * rate为1时表示无影响
 * rate > 1 表示增益
 * rate < 1 表示减益
 */
type BuffEffect = {
    // 经验获取相关
    expGainRate: number;          // 经验获取倍率
    gameExpGainRate: number;      // 游戏经验获取倍率
    singExpGainRate: number;      // 唱歌经验获取倍率
    drawExpGainRate: number;      // 画画经验获取倍率
    affectionExpGainRate: number; // 亲密度经验获取倍率

    // 属性消耗相关
    energyCostRate: number;       // 精力消耗倍率
    hungryCostRate: number;       // 饱食度消耗倍率
    healthCostRate: number;       // 健康消耗倍率
    emotionCostRate: number;      // 心情消耗倍率
    cashCostRate: number;         // 金币消耗倍率

    // 属性获取相关
    energyGainRate: number;       // 精力恢复倍率
    hungryGainRate: number;       // 饱食度恢复倍率
    healthGainRate: number;       // 健康恢复倍率
    emotionGainRate: number;      // 心情恢复倍率

    // 其他效果
    spendingTimeRate: number;           // 消耗时间倍率
    cashGainRate: number;               // 金币获取倍率
}

/**
 * Buff类型定义
 */
type Buff = {
    id: number;
    name: string;
    description: string;
    icon: string;
    type: "positive" | "negative";
    duration: number;  // 持续时间（秒）
    effect: BuffEffect;
    maxStack: number;  // 最大叠加层数
}

type ActiveBuff = {
    id: string;
    buff: Buff;
    endTime: Date;
}

// 默认的buff效果（无任何加成）
const DEFAULT_BUFF_EFFECT: BuffEffect = {
    expGainRate: 1,
    gameExpGainRate: 1,
    singExpGainRate: 1,
    drawExpGainRate: 1,
    affectionExpGainRate: 1,
    energyCostRate: 1,
    hungryCostRate: 1,
    healthCostRate: 1,
    emotionCostRate: 1,
    cashCostRate: 1,
    energyGainRate: 1,
    hungryGainRate: 1,
    healthGainRate: 1,
    emotionGainRate: 1,
    spendingTimeRate: 1,
    cashGainRate: 1
};

export type { Buff, BuffEffect, ActiveBuff };
export { DEFAULT_BUFF_EFFECT };