import { i18n } from "../i18n";

const BUFF_EFFECT_MAP = {
    expGainRate: "buff.effects.expGainRate",
    gameExpGainRate: "buff.effects.gameExpGainRate",
    singExpGainRate: "buff.effects.singExpGainRate",
    drawExpGainRate: "buff.effects.drawExpGainRate",
    affectionExpGainRate: "buff.effects.affectionExpGainRate",
    energyCostRate: "buff.effects.energyCostRate",
    hungryCostRate: "buff.effects.hungryCostRate",
    healthCostRate: "buff.effects.healthCostRate",
    emotionCostRate: "buff.effects.emotionCostRate",
    cashCostRate: "buff.effects.cashCostRate",
    energyGainRate: "buff.effects.energyGainRate",
    hungryGainRate: "buff.effects.hungryGainRate",
    healthGainRate: "buff.effects.healthGainRate",
    emotionGainRate: "buff.effects.emotionGainRate",
    spendingTimeRate: "buff.effects.spendingTimeRate",
    cashGainRate: "buff.effects.cashGainRate",
} as const;

/**
 * 转换活动效果为中文
 * @param effect 效果
 * @returns 效果描述
 * rate = 0.8时，显示-20.00%
 * rate = 1.2时，显示+20.00%
 */
export function convertBuffText(effect: string, rate: number) {
    const messageKey = BUFF_EFFECT_MAP[effect as keyof typeof BUFF_EFFECT_MAP];
    let defaultRate = 1;
    const change = rate < 1
        ? `-${((defaultRate - rate) * 100).toFixed(2)}%`
        : `+${((rate - defaultRate) * 100).toFixed(2)}%`;
    return messageKey ? i18n.global.t(messageKey, { change }) : effect;
}
