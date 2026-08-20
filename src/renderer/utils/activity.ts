import { i18n } from "../i18n";

const ACTIVITY_MAP = {
    hungry: "attributes.hungry",
    energy: "attributes.energy",
    emotion: "attributes.emotion",
    health: "attributes.health",
    cash: "attributes.cash",
    exp: "attributes.exp",
    gameExp: "attributes.gameExp",
    singExp: "attributes.singExp",
    drawExp: "attributes.drawExp",
    affectionExp: "attributes.affectionExp",
    level: "attributes.level",
    singLevel: "attributes.singLevel",
    drawLevel: "attributes.drawLevel",
    gameLevel: "attributes.gameLevel",
    affectionLevel: "attributes.affectionLevel",
} as const;

/**
 * 转换活动效果为中文
 * @param effect 效果
 * @returns 效果名称
 */
export function convertActivityText(effect: string) {
    const messageKey = ACTIVITY_MAP[effect as keyof typeof ACTIVITY_MAP];
    return messageKey ? i18n.global.t(messageKey) : effect;
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
    const timeParts: string[] = [];
    if (seconds > 0) {
        timeParts.unshift(`${seconds}${i18n.global.t("common.seconds")}`);
    }
    if (minutes > 0) {
        timeParts.unshift(`${minutes}${i18n.global.t("common.minutes")}`);
    }
    if (hours > 0) {
        timeParts.unshift(`${hours}${i18n.global.t("common.hours")}`);
    }
    return timeParts.join(" ");
}

