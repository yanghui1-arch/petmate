const BUFF_EFFECT_MAP = {
    expGainRate: "经验获取倍率",
    gameExpGainRate: "游戏经验获取倍率",
    singExpGainRate: "唱歌经验获取倍率",
    drawExpGainRate: "绘画经验获取倍率",
    affectionExpGainRate: "亲密度经验获取倍率",

    energyCostRate: "精力消耗倍率",
    hungryCostRate: "饱食度消耗倍率",
    healthCostRate: "健康消耗倍率",
    emotionCostRate: "心情消耗倍率",
    cashCostRate: "金币消耗倍率",

    energyGainRate: "精力恢复倍率",
    hungryGainRate: "饱食度恢复倍率",
    healthGainRate: "健康恢复倍率",
    emotionGainRate: "心情恢复倍率",

    spendingTimeRate: "消耗时间倍率",
    cashGainRate: "金币获取倍率",
}

/**
 * 转换活动效果为中文
 * @param effect 效果
 * @returns 效果描述
 * rate = 0.8时，显示-20.00%
 * rate = 1.2时，显示+20.00%
 */
export function convertBuffText(effect: string, rate: number) {
    let text = BUFF_EFFECT_MAP[effect as keyof typeof BUFF_EFFECT_MAP]
    let defaultRate = 1;
    if (rate < 1) {
        return text + "-" + ((defaultRate - rate) * 100).toFixed(2) + "%";
    }
    return text + "+" + ((rate - defaultRate) * 100).toFixed(2) + "%";
}