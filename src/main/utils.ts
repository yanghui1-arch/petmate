import { Buff, BuffEffect, DEFAULT_BUFF_EFFECT } from "./types/buff"

/**
 *  计算下一级所需经验
 *      Args:
 *          currentLevel: 当前等级
 *      Return:
 *          下一级所需经验
 */
export function calcNextExp(currentLevel: number): number {
    const baseRatio = 50
    const incrementRatio = 1.7
    const linearRatio = 100
    const nextExp = Math.floor(baseRatio * currentLevel ** incrementRatio + linearRatio * currentLevel)
    return nextExp
}

/**
 * 计算当前等级对应的属性值上限
 * @param level 当前等级
 * @returns 属性值上限
 */
export function calcMaxAttribute(level: number): number {
    const MAX = 1_000_000;
    const k = 0.08;           // 控制曲线斜率（0.05~0.1间可调）
    const m = level / 2;   // 中点控制，等级一半时属性接近 MAX/2

    const expPart = Math.exp(-k * (level - m));
    const value = MAX / (1 + expPart);

    return Math.floor(value);
}

export function calcBuffEffect(buffs: Buff[]): BuffEffect {
    const finalBuffEffect: BuffEffect = DEFAULT_BUFF_EFFECT;
    buffs.forEach(buff => {
        // 经验
        finalBuffEffect.expGainRate *= buff.effect.expGainRate;
        finalBuffEffect.gameExpGainRate *= buff.effect.gameExpGainRate;
        finalBuffEffect.singExpGainRate *= buff.effect.singExpGainRate;
        finalBuffEffect.drawExpGainRate *= buff.effect.drawExpGainRate;
        finalBuffEffect.affectionExpGainRate *= buff.effect.affectionExpGainRate;
        // 属性消耗
        finalBuffEffect.energyCostRate *= buff.effect.energyCostRate;
        finalBuffEffect.hungryCostRate *= buff.effect.hungryCostRate;
        finalBuffEffect.healthCostRate *= buff.effect.healthCostRate;
        finalBuffEffect.emotionCostRate *= buff.effect.emotionCostRate;
        // 属性获取
        finalBuffEffect.energyGainRate *= buff.effect.energyGainRate;
        finalBuffEffect.hungryGainRate *= buff.effect.hungryGainRate;
        finalBuffEffect.healthGainRate *= buff.effect.healthGainRate;
        finalBuffEffect.emotionGainRate *= buff.effect.emotionGainRate;
        // 其他效果
        finalBuffEffect.spendingTimeRate *= buff.effect.spendingTimeRate;
        finalBuffEffect.cashGainRate *= buff.effect.cashGainRate;
    });

    return finalBuffEffect;
}