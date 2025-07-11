import { ActiveBuff, BuffEffect, DEFAULT_BUFF_EFFECT } from "../../types/buff"

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
 * 计算当前等级对应的属性值上限, 这个属性值上限的计算公式需要更改，还没完全确定下来的！！
 * @param level 当前等级
 * @returns 属性值上限
 */
export function calcMaxAttribute(level: number): number {
    const value = 100 * level;
    return Math.floor(value);
}

/**
 * 计算buff效果
 * @param buffs 当前buff列表
 * @returns 当前buff效果
 */
export function calcBuffEffect(buffs: ActiveBuff[]): BuffEffect {
    const finalBuffEffect: BuffEffect = DEFAULT_BUFF_EFFECT;
    buffs.forEach(activeBuff => {
        // 确保Buff生效才会计算，以防万一
        if (activeBuff.endTime >= new Date()) {
            const buffEffect:BuffEffect = activeBuff.buff.effect;
            // 经验
            finalBuffEffect.expGainRate *= buffEffect.expGainRate;
            finalBuffEffect.gameExpGainRate *= buffEffect.gameExpGainRate;
            finalBuffEffect.singExpGainRate *= buffEffect.singExpGainRate;
            finalBuffEffect.drawExpGainRate *= buffEffect.drawExpGainRate;
            finalBuffEffect.affectionExpGainRate *= buffEffect.affectionExpGainRate;
            // 属性消耗
            finalBuffEffect.energyCostRate *= buffEffect.energyCostRate;
            finalBuffEffect.hungryCostRate *= buffEffect.hungryCostRate;
            finalBuffEffect.healthCostRate *= buffEffect.healthCostRate;
            finalBuffEffect.emotionCostRate *= buffEffect.emotionCostRate;
            // 属性获取
            finalBuffEffect.energyGainRate *= buffEffect.energyGainRate;
            finalBuffEffect.hungryGainRate *= buffEffect.hungryGainRate;
            finalBuffEffect.healthGainRate *= buffEffect.healthGainRate;
            finalBuffEffect.emotionGainRate *= buffEffect.emotionGainRate;
            // 其他效果
            finalBuffEffect.spendingTimeRate *= buffEffect.spendingTimeRate;
            finalBuffEffect.cashGainRate *= buffEffect.cashGainRate;
        }
    });

    return finalBuffEffect;
}