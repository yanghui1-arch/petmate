import logger from "../../log";
import { achievements } from "../../achievement"
import { greenworksManager } from "../../greenworks"

/**
 * 增加统计数据
 * @param name 统计数据名称
 * @param addValue 增加的值
 * @param isStore 是否存储
 * @param successCallback 成功回调
 * @param failureCallback 失败回调
 * @returns value 当前的值
 */
function addStat(name: string, addValue: number, isStore: boolean, successCallback: () => void, failureCallback: (err: string) => void) {
    if (!greenworksManager.isReady()) {
        logger.error('Cannot set stats: Greenworks not initialized');
        return 0;
    }
    const currentValue = greenworksManager.getStatInt(name)
    greenworksManager.setStat(name, currentValue + addValue)
    if (isStore) {
        greenworksManager.storeStats(successCallback, failureCallback)
    }
    return currentValue + addValue
}

/**
 * 设置统计数据，目前数值型的统计数据都是增加，因此要判断是否增加
 * @param name 统计数据名称
 * @param value 设置的值
 * @param isStore 是否存储
 * @param successCallback 成功回调
 * @param failureCallback 失败回调
 * @returns 当前的值
 */
function setStat(name: string, value: number, isStore: boolean, successCallback: () => void, failureCallback: (err: string) => void) {
    if (!greenworksManager.isReady()) {
        logger.error('Cannot set stats: Greenworks not initialized');
        return 0;
    }
    const currentValue = greenworksManager.getStatInt(name)
    if (currentValue > value) {
        logger.error('Cannot set stats: stats value is less than the current value')
        return currentValue
    }
    greenworksManager.setStat(name, value)
    if (isStore) {
        greenworksManager.storeStats(successCallback, failureCallback)
    }
    return value
}

/**
 * 激活成就
 * @param achievement 成就名称
 * @param successCallback 成功回调
 * @param failureCallback 失败回调
 */
function activateAchievement(achievement: string, successCallback: () => void, failureCallback?: (err: string) => void) {
    return greenworksManager.activateAchievement(achievement, successCallback, failureCallback)
}

const CHAT_COUNT = "ChatCount"
const CHARACTER_LEVEL = "CharacterLevel"
const ENTERTAINMENT_COUNT = "EntertainmentCount"

/**
 * 以下为直接激活成就，在外部调用时判断是否需要激活
*/
/**
 * 激活初见成就
 */
export function achieveFirstOpen() {
    activateAchievement(achievements.ACH_FIRST_OPEN, () => { }, (err) => {
        logger.error(`Achievement: ${achievements.ACH_FIRST_OPEN} activate failed: ${err}`)
    })
}

/**
 * 以下为通过统计数据来激活成就，当用户做完对应事件时，调用此函数来统计数据，并在内部判断是否需要激活成就
 */

/**
 * 处理心情成就
 * @param emotion 心情值
 */
export function handleEmotionAchievement(emotion: number) {
    if (emotion <= 50) {
        activateAchievement(achievements.ACH_LITTLE_SAD, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_LITTLE_SAD} activate failed: ${err}`)
        })
    }
    if (emotion <= 20) {
        activateAchievement(achievements.ACH_SAD, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_SAD} activate failed: ${err}`)
        })
    }
}

/**
 * 处理好感度成就，好感度经验值在游戏内存储，不需要上传到Steam
 * @param affectionExp 好感度经验值
 */
export function handleFiftyAffectionAchievement(affectionExp: number) {
    if (affectionExp >= 50) {
        activateAchievement(achievements.ACH_FIFTY_AFFECTION, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_FIFTY_AFFECTION} activate failed: ${err}`)
        })
    }
}

/**
 * 处理聊天成就
 */
export function handleChatAchievement() {
    const chatCount = addStat(CHAT_COUNT, 1, true, () => { }, (err) => {
        logger.error(`Achievement: ${CHAT_COUNT} set failed: ${err}`)
    })
    if (chatCount === 1) {
        activateAchievement(achievements.ACH_FIRST_CHAT, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_FIRST_CHAT} activate failed: ${err}`)
        })
    } else if (chatCount === 100) {
        activateAchievement(achievements.ACH_ONE_HUNDRED_CHAT, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_ONE_HUNDRED_CHAT} activate failed: ${err}`)
        })
    } else if (chatCount === 500) {
        activateAchievement(achievements.ACH_FIVE_HUNDRED_CHAT, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_FIVE_HUNDRED_CHAT} activate failed: ${err}`)
        })
    } else if (chatCount === 1000) {
        activateAchievement(achievements.ACH_ONE_THOUSAND_CHAT, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_ONE_THOUSAND_CHAT} activate failed: ${err}`)
        })
    }
}

/**
 * 处理等级成就，角色等级在游戏内存储，不需要上传到Steam
 * @param characterLevel 角色等级
 */
export function handleCharacterLevelAchievement(characterLevel: number) {
    characterLevel = setStat(CHARACTER_LEVEL, characterLevel, true, () => { }, (err) => {
        logger.error(`Achievement: ${CHARACTER_LEVEL} set failed: ${err}`)
    })
    if (characterLevel >= 5 && characterLevel < 10) {
        activateAchievement(achievements.ACH_FIVE_LEVEL, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_FIVE_LEVEL} activate failed: ${err}`)
        })
    } else if (characterLevel >= 10 && characterLevel < 30) {
        activateAchievement(achievements.ACH_TWENTY_LEVEL, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_TWENTY_LEVEL} activate failed: ${err}`)
        })
    } else if (characterLevel >= 30 && characterLevel < 50) {
        activateAchievement(achievements.ACH_THIRTY_LEVEL, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_THIRTY_LEVEL} activate failed: ${err}`)
        })
    } else if (characterLevel >= 50 && characterLevel < 100) {
        activateAchievement(achievements.ACH_FIFTY_LEVEL, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_FIFTY_LEVEL} activate failed: ${err}`)
        })
    }
}

/**
 * 处理娱乐成就
 */
export function handleEntertainmentAchievement() {
    const entertainmentCount = addStat(ENTERTAINMENT_COUNT, 1, true, () => { }, (err) => {
        logger.error(`Achievement: ${ENTERTAINMENT_COUNT} set failed: ${err}`)
    })
    if (entertainmentCount === 10) {
        activateAchievement(achievements.ACH_TEN_ENTERTAINMENT, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_TEN_ENTERTAINMENT} activate failed: ${err}`)
        })
    } else if (entertainmentCount === 20) {
        activateAchievement(achievements.ACH_TWENTY_ENTERTAINMENT, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_TWENTY_ENTERTAINMENT} activate failed: ${err}`)
        })
    } else if (entertainmentCount === 50) {
        activateAchievement(achievements.ACH_FIFTY_ENTERTAINMENT, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_FIFTY_ENTERTAINMENT} activate failed: ${err}`)
        })
    } else if (entertainmentCount === 100) {
        activateAchievement(achievements.ACH_ONE_HUNDRED_ENTERTAINMENT, () => { }, (err) => {
            logger.error(`Achievement: ${achievements.ACH_ONE_HUNDRED_ENTERTAINMENT} activate failed: ${err}`)
        })
    }
}