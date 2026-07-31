/**
 * 暴露ipc事件
 */

import { ipcMain, IpcMainInvokeEvent, IpcMainEvent, screen, BrowserWindow, app } from 'electron';
import { shell } from 'electron';
import { is } from '@electron-toolkit/utils'
import { playerManager, ServerData } from './modules/store';
import { PlayerInfo } from './types/player';
import { Response } from '../types/response';
import { consumeItem, consumePackageItems, PackageItemConsumeRequirement } from './modules/player/basic';
import { LABOR_SKIRT_SKIN_ID, playerResourceManager, SkinAlreadyOwnedError } from './modules/player/resource';
import logger from './log';
import { PetMate } from './modules/petmate/petmate';
import { startActivity, finishActivity, cancelActivity, claimActivityReward } from './modules/player/act';
import { ActiveBuff } from './types/buff';
import { MAX_WISHES_STORE_NUM } from './constant';
import { Wish } from './types/wish';
import { Item, ItemType } from './types/item';
import { buyItem } from './modules/player/basic';
import { ActivityInfo } from './types/activity';
import { getCompletedWishesNum, showActivities, showItems, getItemInfo } from './modules/show';
import { ChatLLMConfigError, LLMConfigError, NotEnoughError, NotFoundError, TTSProcessError } from './error';
import { wishHandler } from './modules/wish';
import { getModelSize, getSettings, SettingConfig, updateSettings, defaultSettings } from './settings';
import {
    chat,
    ChatLLMConfig, ChatMessage,
    cloneVoice,
    getChatLLMConfig, getTTSLLMConfig,
    initLLM,
    setChatLLMConfig,
    setTTSLLMConfig,
    TTSLLMConfig,
    TTSVoice,
    addTTSVoice, getTTSVoiceList,
    listenTTSVoiceSample,
    getChatPrompt,
    updateChatPrompt,
    saveChatHistoryMessages,
    memorySummary,
    clearChatHistoryMessages,
    HistoryChatMessage,
    getHistoryChatMessages
} from './llm';
import { windowMonitor, WindowInfo, WindowEvent } from './window-monitor';
import { getMainWindow, getPageWindow } from './index';
import { CommissionCompletionResult, PlayerResourceState } from './types/player-resource';
import * as path from 'path';
import * as fs from 'fs';
import axios, { AxiosResponse } from 'axios';
import { Youmei } from './modules/petmate/youmei';
import { greenworksManager } from './greenworks';
import { localAIManager, LocalAIStatus } from './local-ai';

/**
 * 初始化设置数据
 * 将玩家自定义的设置数据加载到内存中，如果玩家没有自定义的设置数据，则初始化默认设置，并写入到自定义的设置数据中
 * @returns 玩家自定义的设置数据
 */
ipcMain.handle("init-settings", (_: IpcMainInvokeEvent): Response<SettingConfig> => {
    try {
        const settings: SettingConfig = getSettings();
        return {
            code: 200,
            message: "初始化设置数据成功",
            data: settings
        } as Response<SettingConfig>;
    } catch (error) {
        if (error instanceof NotFoundError) {
            // 如果设置不存在，则初始化默认设置，然后保存到文件中
            const officialSettings: SettingConfig = defaultSettings
            updateSettings(officialSettings);
            return {
                code: 200,
                message: "初始化设置数据成功，已初始化默认设置。",
                data: officialSettings
            } as Response<SettingConfig>;
        }
        return {
            code: 400,
            message: "初始化设置数据失败"
        }
    }
})

/**
 * 初始化llm配置
 * 玩家会有自己的llm的api_key和base_url，如果没有定义自己的api_key或者base_url, 需要给一个提醒，否则应该加载默认的配置
 */
ipcMain.handle("init-llm", (_: IpcMainInvokeEvent): Response<void> => {
    try {
        initLLM()
        logger.info("llm所需要的东西已准备就绪")
        return {
            code: 200,
            message: "llm所需要的东西已准备就绪"
        }
    } catch (error) {
        if (error instanceof LLMConfigError) {
            logger.error(`初始化llm配置失败，模型配置错误: ${error}`);
            return {
                code: 400,
                message: "初始化llm配置的时候出错了，请确定自己模型的配置是正确的，如果已确保是正确的，请反馈给我们！"
            } as Response<void>;
        }
        return {
            code: 400,
            message: "初始化llm失败"
        } as Response<void>;
    }
})

ipcMain.handle("get-local-ai-status", (_: IpcMainInvokeEvent): Response<LocalAIStatus> => {
    return {
        code: 200,
        data: localAIManager.getStatus()
    }
})

ipcMain.handle(
    "set-local-ai-enabled",
    async (_: IpcMainInvokeEvent, enabled: boolean): Promise<Response<LocalAIStatus>> => {
        try {
            const status = await localAIManager.setEnabled(enabled)
            return {
                code: 200,
                message: enabled ? "本地模型加载成功" : "本地模型已卸载",
                data: status
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            logger.error(`[local-ai] 切换本地模型失败: ${message}`)
            return {
                code: 400,
                message,
                data: localAIManager.getStatus()
            }
        }
    }
)

/**
 * 消耗物品
 * @param itemId 物品id
 * @param count 消耗数量
 * @param petmateId petmate的id
 * @returns 消耗物品成功或失败
 */
ipcMain.handle("consume-item", (_: IpcMainInvokeEvent, itemId: number, count: number, petmateId: number): Response<void> => {
    try {
        consumeItem(itemId, count, petmateId);
        return {
            code: 200,
            message: "消耗物品成功"
        } as Response<void>;
    } catch (error) {
        logger.error(`消耗物品失败: ${error}`);
        return {
            code: 400,
            message: "消耗物品失败"
        } as Response<void>;
    }
})

const notifyPlayerResourcesUpdated = (resources: PlayerResourceState): void => {
    getMainWindow()?.webContents.send("player-resources-updated", resources);
    try {
        getPageWindow()?.webContents.send("player-resources-updated", resources);
    } catch (error) {
        logger.warn(`玩家资源更新通知页面窗口失败: ${error}`);
    }
}

ipcMain.handle("get-player-resources", (_: IpcMainInvokeEvent): Response<PlayerResourceState> => {
    try {
        return {
            code: 200,
            data: playerResourceManager.getResources()
        } as Response<PlayerResourceState>;
    } catch (error) {
        logger.error(`获取玩家资源失败: ${error}`);
        return {
            code: 400,
            message: "获取玩家资源失败"
        } as Response<PlayerResourceState>;
    }
})

ipcMain.handle("claim-labor-skin", (_: IpcMainInvokeEvent): Response<PlayerResourceState> => {
    try {
        const resources = playerResourceManager.claimSkin(LABOR_SKIRT_SKIN_ID);
        notifyPlayerResourcesUpdated(resources);

        return {
            code: 200,
            message: "领取成功",
            data: resources
        } as Response<PlayerResourceState>;
    } catch (error) {
        logger.error(`领取五一短裙套装失败: ${error}`);
        if (error instanceof SkinAlreadyOwnedError) {
            return {
                code: 409,
                message: error.message,
                data: playerResourceManager.getResources()
            } as Response<PlayerResourceState>;
        }

        return {
            code: 400,
            message: error instanceof Error ? error.message : "领取失败"
        } as Response<PlayerResourceState>;
    }
})

ipcMain.handle("equip-player-skin", (_: IpcMainInvokeEvent, skinId: string): Response<PlayerResourceState> => {
    try {
        const resources = playerResourceManager.equipSkin(skinId);
        notifyPlayerResourcesUpdated(resources);

        return {
            code: 200,
            message: "实装成功",
            data: resources
        } as Response<PlayerResourceState>;
    } catch (error) {
        logger.error(`实装套装失败: ${error}`);
        return {
            code: 400,
            message: error instanceof Error ? error.message : "实装失败"
        } as Response<PlayerResourceState>;
    }
})

ipcMain.handle("equip-player-title", (_: IpcMainInvokeEvent, titleId: string): Response<PlayerResourceState> => {
    try {
        const resources = playerResourceManager.equipTitle(titleId);
        notifyPlayerResourcesUpdated(resources);

        return {
            code: 200,
            message: "称谓设置成功",
            data: resources
        } as Response<PlayerResourceState>;
    } catch (error) {
        logger.error(`设置称谓失败: ${error}`);
        return {
            code: 400,
            message: error instanceof Error ? error.message : "设置称谓失败"
        } as Response<PlayerResourceState>;
    }
})

/**
 * 完成委托。
 * 先扣除交付材料，再发放本次随机奖励。
 */
ipcMain.handle("complete-commission", (_: IpcMainInvokeEvent, commissionId: string, requirements: PackageItemConsumeRequirement[], completionCount: number = 1): Response<CommissionCompletionResult> => {
    try {
        if (!playerResourceManager.getCommissionRewardBundle(commissionId)) {
            return {
                code: 400,
                message: "未知委托"
            } as Response<CommissionCompletionResult>;
        }

        if (!Number.isInteger(completionCount) || completionCount <= 0) {
            return {
                code: 400,
                message: "交付次数不合法"
            } as Response<CommissionCompletionResult>;
        }

        const totalRequirements = requirements.map(requirement => ({
            itemId: requirement.itemId,
            count: requirement.count * completionCount
        }));
        consumePackageItems(totalRequirements);
        const result = playerResourceManager.completeCommission(commissionId, requirements, completionCount);
        notifyPlayerResourcesUpdated(result.resources);

        return {
            code: 200,
            message: "委托完成",
            data: result
        } as Response<CommissionCompletionResult>;
    } catch (error) {
        logger.error(`完成委托失败: ${error}`);
        return {
            code: 400,
            message: error instanceof Error ? error.message : "完成委托失败"
        } as Response<CommissionCompletionResult>;
    }
})

/**
 * 购买物品
 * @param itemId 物品id
 * @param count 购买数量
 * @returns 购买的物品
 */
ipcMain.handle("buy-item", (_: IpcMainInvokeEvent, itemId: number, count: number): Response<Item> => {
    try {
        const item: Item = buyItem(itemId, count);
        return {
            code: 200,
            message: "购买物品成功",
            data: item
        } as Response<Item>;
    } catch (error) {
        logger.error(`购买物品失败: ${error}`);
        return {
            code: 400,
            message: "购买物品失败"
        } as Response<Item>;
    }
})

/**
 * 克隆音色
 * 文件格式需要是.mp3/.wav，这样的文件格式对tts来说支持比较好
 * 传过来的url必须得是公网可访问的，如果是百度云等网盘的url是不可以的，推荐用gitee/github/oss
 * @param url 根据这个url克隆音色
 * @returns 克隆音色成功或失败，如果成功的话会返回一个音色id，如果失败的话会返回一个详细的错误信息
 */
ipcMain.handle("clone-voice", async (_: IpcMainInvokeEvent, url: string): Promise<Response<string>> => {
    try {
        const voiceID: string = await cloneVoice(url);
        return {
            code: 200,
            data: voiceID
        } as Response<string>;
    } catch (error) {
        logger.error(`克隆音色失败: ${error}`);
        return {
            code: 400,
            message: `克隆音色失败: ${error}`
        } as Response<string>;
    }
})


/**
 * 试听音色
 * 会向渲染层发送tts-audio-chunk事件，渲染层通过接收tts-audio-chunk就可以获取到音频内容
 * 结束的时候会发送tts-finished事件
 * @param voice 要试听的音色
 * @returns 试听音色成功或失败，如果成功的话会返回一个音色id，如果失败的话会返回一个详细的错误信息
 */
ipcMain.handle("listen-tts-voice-sample", async (event: IpcMainInvokeEvent, voice: TTSVoice, text: string): Promise<Response<void>> => {
    try {
        await listenTTSVoiceSample(voice, text, event.sender);
        return {
            code: 200,
            message: "试听音色成功"
        } as Response<void>;
    } catch (error) {
        logger.error(`试听音色失败: ${error}`);
        return {
            code: 400,
            message: `试听音色失败: ${error}`
        } as Response<void>;
    }
})

/**
 * 玩家与petmate进行聊天
 * 调用该方法时，会自动的将此次信息纳入为历史信息中，并且进行流式的tts转录，并且直接将转录后的信息发送给渲染进程
 * 目前只接收文本信息，并且返回的是音频
 * 当返回的code为401的时候意味着发送的文本超过了上下文，需要调用方法继续调用一次chat，并且将上一次的chat信息作为message传入
 * @param message 聊天信息
 * @returns 发送聊天信息成功或失败
 */
ipcMain.handle("chat", async (event: IpcMainInvokeEvent, message: ChatMessage, speak: boolean = true): Promise<Response<void>> => {
    try {
        await chat(message, event.sender, speak);
        return {
            code: 200,
            message: "发送聊天信息成功"
        } as Response<void>;
    } catch (error) {
        if (error instanceof LLMConfigError) {
            logger.error(`发送聊天信息失败，模型配置错误: ${error}`);
            return {
                code: 400,
                message: "发送聊天信息失败，请检查模型的配置是否正确"
            } as Response<void>;
        } else if (error instanceof ChatLLMConfigError) {
            logger.error(`发送聊天信息失败，聊天信息的role不是user: ${error}`);
            return {
                code: 400,
                message: "发送聊天信息失败，确保发送的信息配置是正常的"
            } as Response<void>;
        } else if (error instanceof TTSProcessError) {
            logger.error(`发送聊天信息失败，TTS参数未正确初始化: ${error}`);
            return {
                code: 400,
                message: "发送聊天信息失败，语音合成参数未正确初始化"
            } as Response<void>;
        } else if ((error as Error).message === 'Invalid string length' || (error as Error).message.includes("Range of input length should be")) {
            // 超过上下文了，做一次记忆总结，并将原来的历史聊天记录清空，然后再初始化一次LLM
            logger.error(`发送聊天信息失败，超过上下文了，需要重新发送一次chat: ${error}`);
            const summary: string = await memorySummary();
            clearChatHistoryMessages();
            initLLM();
            logger.info(`[llm] 记忆刷新：${summary}`);
            return {
                code: 401, // 特殊 code
                message: "发送聊天信息失败，超过上下文了，需要重新发送一次chat"
            } as Response<void>;
        } else if ((error as Error).message === 'Output data may contain inappropriate content.') {
            logger.error(`发送聊天信息失败，内容可能包含黄色内容，你可能需要更改说话风格以实现越狱效果。: ${error}`);
            return {
                code: 400,
                message: "发送聊天信息失败，内容可能包含黄色内容，你可能需要更改说话风格以实现越狱效果。"
            } as Response<void>;
        }

        logger.error(`发送聊天信息失败，未知错误: ${error}`);
        return {
            code: 400,
            message: "发送聊天信息失败"
        } as Response<void>;
    }
})

/**
 * 获取活动
 * @param type 活动类型
 * @returns 活动列表
 */
ipcMain.handle("show-activities", (_: IpcMainInvokeEvent, type: ActivityInfo["type"]): Response<ActivityInfo[]> => {
    try {
        const activities: ActivityInfo[] = showActivities(type);
        return {
            code: 200,
            data: activities
        } as Response<ActivityInfo[]>;
    } catch (error) {
        logger.error(`获取活动失败: ${error}`);
        return {
            code: 400,
            message: "获取活动失败"
        } as Response<ActivityInfo[]>;
    }
})

/**
 * 开启一个活动
 * @param petmateId petmate的id
 * @param activityId 活动的id
 * @returns 开启活动成功或失败
 */
ipcMain.handle("start-activity", (_: IpcMainInvokeEvent, petmateId: number, activityId: number): Response<void> => {
    try {
        startActivity(petmateId, activityId);
        return {
            code: 200,
            message: "开启活动成功"
        } as Response<void>;
    } catch (error) {
        logger.error(`开启活动失败: ${error}`);
        if (error instanceof NotEnoughError) {
            return {
                code: 400,
                message: error.message
            } as Response<void>;
        }
        return {
            code: 400,
            message: "开启活动失败"
        } as Response<void>;
    }
})

/**
 * 取消一个活动
 * @param petmateId petmate的id
 * @returns 取消活动成功或失败
 */
ipcMain.handle("cancel-activity", (_: IpcMainInvokeEvent, petmateId: number): Response<void> => {
    try {
        cancelActivity(petmateId);
        return {
            code: 200,
            message: "取消活动成功"
        } as Response<void>;
    } catch (error) {
        return {
            code: 400,
            message: "取消活动失败"
        } as Response<void>;
    }
})

/**
 * 领取活动奖励，并结束活动
 * @param petmateId petmate的id
 * @returns 领取奖励成功或失败
 */
ipcMain.handle("claim-activity-reward", (_: IpcMainInvokeEvent, petmateId: number): Response<void> => {
    try {
        const success = claimActivityReward(petmateId);
        if (success) {
            return {
                code: 200,
                message: "领取奖励成功"
            } as Response<void>;
        } else {
            return {
                code: 400,
                message: "领取奖励失败，活动状态不正确"
            } as Response<void>;
        }
    } catch (error) {
        logger.error(`领取活动奖励失败: ${error}`);
        return {
            code: 400,
            message: "领取活动奖励失败"
        } as Response<void>;
    }
})

/**
 * 获取玩家数据
 * 该方法可以被多次调用，每次调用都会返回玩家最新的数据，如果需要刷新玩家数据，请你调用这个方法
 */
ipcMain.handle("get-current-player-data", (_: IpcMainInvokeEvent): Response<PlayerInfo> => {
    try {
        const playerInfo: PlayerInfo = playerManager.getPlayer();
        return {
            code: 200,
            data: playerInfo
        } as Response<PlayerInfo>;
    } catch (error) {
        logger.error(`获取玩家数据失败: ${error}`);
        return {
            code: 400,
            message: "获取玩家数据失败"
        } as Response<PlayerInfo>;
    }
})

/**
 * 获取物品
 * @param type 物品类型
 * @returns 物品列表
 */
ipcMain.handle("show-items", (_: IpcMainInvokeEvent, type: ItemType): Response<Item[]> => {
    try {
        const items: Item[] = showItems(type);
        return {
            code: 200,
            data: items
        } as Response<Item[]>;
    } catch (error) {
        logger.error(`获取物品失败: ${error}`);
        return {
            code: 400,
            message: "获取物品失败"
        } as Response<Item[]>;
    }
})

/**
 * 根据物品id获取物品信息
 * @param itemIds 物品id列表
 * @returns 物品信息列表
 */
ipcMain.handle("get-item-info", (_: IpcMainInvokeEvent, itemIds: number[]): Response<Item[]> => {
    try {
        const items: Item[] = getItemInfo(itemIds);
        return {
            code: 200,
            data: items
        } as Response<Item[]>;
    } catch (error) {
        logger.error(`获取物品失败: ${error}`);
        return {
            code: 400,
            message: "获取物品失败"
        } as Response<Item[]>;
    }
})

/**
 * 获取完成petmate的心愿数量
 * @param petmateId petmate的id
 * @returns 完成的心愿数量
 */
ipcMain.handle("get-petmate-completed-wishes-num", (_: IpcMainInvokeEvent, petmateId: number): Response<number> => {
    try {
        const petmate: PetMate | undefined = playerManager.getPlayer().petmates.find(petmate => petmate.id === petmateId);
        if (!petmate) {
            throw new NotFoundError("petmate不存在");
        }
        const num: number = getCompletedWishesNum(petmate);
        return {
            code: 200,
            data: num
        } as Response<number>;
    } catch (error) {
        logger.error(`获取完成的心愿数量失败: ${error}`);
        return {
            code: 400,
            message: "获取完成的心愿数量失败"
        } as Response<number>;
    }
})

/**
 * 获取Petmate的某个特定的心愿
 *
 */
ipcMain.handle("get-petmate-one-wish", (_: IpcMainInvokeEvent, petmateId: number, wishId: string): Response<Wish> => {
    try {
        const petmate: PetMate | undefined = playerManager.getPlayer().petmates.find(petmate => petmate.id === petmateId);
        if (!petmate) {
            throw new NotFoundError("petmate不存在");
        }
        const wish: Wish = petmate!.getOneWish(wishId);
        return {
            code: 200,
            data: wish
        } as Response<Wish>;
    } catch (error) {
        logger.error(`获取心愿失败: ${error}`);
        return {
            code: 400,
            message: "获取心愿失败"
        } as Response<Wish>;
    }
})

/**
 * 手动领取心愿奖励
 * @param petmateId petmate的id
 * @param wishId 要领取的心愿id
 * @returns 是否成功领取
 */
ipcMain.handle("claim-wish-reward", (_: IpcMainInvokeEvent, petmateId: number, wishId: string): Response<boolean> => {
    try {
        const player = playerManager.getPlayer();
        const petmate: PetMate | undefined = player.petmates.find(p => p.id === petmateId);

        if (!petmate) {
            return {
                code: 400,
                message: "未找到指定的Petmate"
            } as Response<boolean>;
        }

        const success = wishHandler.claimWishReward(petmate, player, wishId);
        if (success) {
            return {
                code: 200,
                data: success
            } as Response<boolean>;
        } else {
            return {
                code: 400,
                message: "领取心愿奖励失败"
            } as Response<boolean>;
        }
    } catch (error) {
        logger.error(`领取心愿奖励失败: ${error}`);
        return {
            code: 400,
            message: error instanceof Error ? error.message : "领取心愿奖励失败"
        } as Response<boolean>;
    }
})

/**
 * 获取模型大小
 * @returns 模型大小
 */
ipcMain.handle("get-model-size", (_: IpcMainInvokeEvent): Response<number> => {
    try {
        const size: number = getModelSize();
        return {
            code: 200,
            data: size
        } as Response<number>;
    } catch (error) {
        logger.error(`获取模型大小失败: ${error}`);
        return {
            code: 400,
            message: "获取模型大小失败"
        } as Response<number>;
    }
})

/**
 * 获取设置
 * @returns 设置
 */
ipcMain.handle("get-settings", (_: IpcMainInvokeEvent): Response<SettingConfig> => {
    try {
        const settings: SettingConfig = getSettings();
        return {
            code: 200,
            data: settings
        } as Response<SettingConfig>;
    } catch (error) {
        logger.error(`获取设置失败: ${error}`);
        return {
            code: 400,
            message: "获取设置失败"
        } as Response<SettingConfig>;
    }
})

/**
 * 获取Chat LLM配置
 * @returns Chat LLM配置, 如果失败的话则返回一个错误信息
 */
ipcMain.handle("get-chat-llm-config", (_: IpcMainInvokeEvent): Response<ChatLLMConfig> => {
    try {
        const chatLLMConfig: ChatLLMConfig = getChatLLMConfig();
        return {
            code: 200,
            data: chatLLMConfig
        } as Response<ChatLLMConfig>;
    } catch (error) {
        logger.error(`获取Chat LLM配置失败: ${error}`);
        return {
            code: 400,
            message: "获取Chat LLM配置失败"
        } as Response<ChatLLMConfig>;
    }
});

/**
 * 获取Chat LLM的提示词
 */
ipcMain.handle("get-chat-prompt", (_: IpcMainInvokeEvent): Response<string> => {
    try {
        const prompt: string = getChatPrompt();
        return {
            code: 200,
            data: prompt
        } as Response<string>;
    } catch (error) {
        logger.error(`获取Chat LLM的提示词失败: ${error}`);
        return {
            code: 400,
            message: "获取Chat LLM的提示词失败"
        } as Response<string>;
    }
})

/**
 * 获取历史聊天记录信息
 * @returns 历史聊天记录信息
 */
ipcMain.handle("get-history-chat-messages", (_: IpcMainInvokeEvent): Response<HistoryChatMessage[]> => {
    try {
        const historyChatMessages: HistoryChatMessage[] = getHistoryChatMessages();
        return {
            code: 200,
            data: historyChatMessages
        } as Response<HistoryChatMessage[]>;
    } catch (error) {
        logger.error(`获取历史聊天记录信息失败: ${error}`);
        return {
            code: 400,
            data: [] as HistoryChatMessage[]
        } as Response<HistoryChatMessage[]>;
    }
})

/**
 * 获取TTS LLM配置
 * @returns TTS LLM配置, 如果失败的话则返回一个错误信息
 */
ipcMain.handle("get-tts-config", (_: IpcMainInvokeEvent): Response<TTSLLMConfig> => {
    try {
        const ttsLLMConfig: TTSLLMConfig = getTTSLLMConfig();
        return {
            code: 200,
            data: ttsLLMConfig
        } as Response<TTSLLMConfig>;
    } catch (error) {
        logger.error(`获取TTS LLM配置失败: ${error}`);
        return {
            code: 400,
            message: "获取TTS LLM配置失败"
        } as Response<TTSLLMConfig>;
    }
});

/**
 * 获取音色库
 * @returns 音色库
 */
ipcMain.handle("get-tts-voice-list", (_: IpcMainInvokeEvent): Response<TTSVoice[]> => {
    try {
        const ttsVoiceList: TTSVoice[] = getTTSVoiceList();
        return {
            code: 200,
            data: ttsVoiceList
        } as Response<TTSVoice[]>;
    }
    catch (error) {
        logger.error(`获取音色库失败: ${error}`);
        return {
            code: 400,
            message: "获取音色库失败"
        } as Response<TTSVoice[]>;
    }
})

/**
 * 设置Chat LLM配置
 * 每次调用这个方法，必须传入一个完整的ChatLLMConfig类型数据过来，确保配置的完整性，不可以是Partial<ChatLLMConfig>类型
 * @param config 新的Chat LLM配置
 * @returns 设置后的Chat LLM配置, 如果失败的话则返回一个错误信息
 */
ipcMain.handle("set-chat-llm-config", (_: IpcMainInvokeEvent, config: ChatLLMConfig): Response<ChatLLMConfig> => {
    try {
        const newConfig: ChatLLMConfig = setChatLLMConfig(config);
        return {
            code: 200,
            data: newConfig
        } as Response<ChatLLMConfig>;
    } catch (error) {
        logger.error(`设置Chat LLM配置失败: ${error}`);
        return {
            code: 400,
            message: "设置Chat LLM配置失败"
        } as Response<ChatLLMConfig>;
    }
});

/**
 * 设置Chat LLM的提示词
 * 作用：将新的提示词同步到文件中，以方便init-llm重新构建新的聊天记录，使得玩家在chat的时候可以承接上一次继续聊天，并且petmate会以最新的说话风格回复
 * @param prompt 新的Chat LLM提示词
 * @returns 设置后的Chat LLM提示词, 如果失败的话则返回一个错误信息
 */
ipcMain.handle("set-chat-prompt", (_: IpcMainInvokeEvent, prompt: string): Response<void> => {
    try {
        updateChatPrompt(prompt);
        return {
            code: 200,
            message: "设置Chat LLM的提示词成功"
        } as Response<void>;
    }
    catch (error) {
        logger.error(`设置Chat LLM的提示词失败: ${error}`);
        return {
            code: 400,
            message: "设置Chat LLM的提示词失败"
        } as Response<void>;
    }
})

/**
 * 保存聊天记录
 */
ipcMain.handle("save-chat-messages", (_: IpcMainInvokeEvent): Response<void> => {
    try {
        saveChatHistoryMessages();
        return {
            code: 200,
            message: "保存历史聊天记录成功"
        } as Response<void>;
    } catch (error) {
        logger.error(`保存历史聊天记录失败: ${error}`);
        return {
            code: 400,
            message: "保存历史聊天记录失败"
        } as Response<void>;
    }
});

/**
 * 设置TTS LLM配置
 * 每次调用这个方法，必须传入一个完整的TTSLLMConfig类型数据过来，确保配置的完整性，不可以是Partial<TTSLLMConfig>类型
 * @param config 新的TTS LLM配置
 * @returns 设置后的TTS LLM配置, 如果失败的话则返回一个错误信息
 */
ipcMain.handle("set-tts-config", (_: IpcMainInvokeEvent, config: TTSLLMConfig): Response<TTSLLMConfig> => {
    try {
        const newConfig: TTSLLMConfig = setTTSLLMConfig(config);
        return {
            code: 200,
            data: newConfig
        } as Response<TTSLLMConfig>;
    } catch (error) {
        logger.error(`设置TTS LLM配置失败: ${error}`);
        return {
            code: 400,
            message: "设置TTS LLM配置失败"
        } as Response<TTSLLMConfig>;
    }
});

/**
 * 添加一个tts音色
 * @param voice 要添加的音色
 * @returns 添加音色成功或失败，如果成功的话会返回一个音色id，如果失败的话会返回一个详细的错误信息
 */
ipcMain.handle("add-tts-voice", (_: IpcMainInvokeEvent, voice: TTSVoice): Response<void> => {
    try {
        addTTSVoice(voice);
        logger.info(`音色${voice.name}添加成功，已经将音色写入到文件中`);
        return {
            code: 200,
            message: "添加音色成功，已经将音色写入到文件中",
        } as Response<void>;
    } catch (error) {
        logger.error(`添加音色失败: ${error}`);
        return {
            code: 400,
            message: "添加音色失败"
        } as Response<void>;
    }
})

/**
 * 更改设置
 * @param settings 新的设置内容，可以是SettingConfig的一部分内容
 */
ipcMain.handle("update-settings", (_: IpcMainInvokeEvent, settings: Partial<SettingConfig>): Response<void> => {
    try {
        updateSettings(settings);
        return {
            code: 200,
            message: "更改设置成功"
        } as Response<void>;
    } catch (error) {
        logger.error(`更改设置失败: ${error}`);
        return {
            code: 400,
            message: "更改设置失败"
        } as Response<void>;
    }
})

/**
 * 恢复数据
 * 会从服务器上拉数据下来，然后立即更新到文件和内存中，这意味着其实可以不需要从重新启动Petmate，但是为了保险起见，还是建议重新启动Petmate
 */
ipcMain.handle("recover-data", async (_: IpcMainInvokeEvent): Promise<Response<void>> => {
    const steamId: string = greenworksManager.getSteamInfo().steamId;
    try {
        const res: AxiosResponse = await axios.post('http://petmate.fun/api/user/player_info_by_steamid', {
            steamid: steamId
        });

        const response = res.data;
        const code = response.code;

        if (code === 200) {
            const data: ServerData = response.data;
            const player: PlayerInfo = data.playerInfo;
            const toUpdateCash = player.cash + data.inventoryValue;
            const petmate: PetMate = new Youmei(
                data.playerInfo.petmates[0].id,
                '尤美',
                data.playerInfo.petmates[0].attrs,
                data.playerInfo.petmates[0].status,
                data.playerInfo.petmates[0].wishes,
                data.playerInfo.petmates[0].completedWishesNum
            );
            player.petmates[0] = petmate;
            player.cash = toUpdateCash;
            playerManager.updatePlayer(player);
            logger.info(`恢复steamID为${steamId}的数据成功！`);
            return {
                code: 200,
                message: "恢复数据成功, 请重新打开主页或者是重新启动Petmate"
            };
        } else {
            logger.error(`获取steamID为${steamId}的玩家信息失败, 没有这个数据。`);
            return {
                code: 404,
                message: "你不是老玩家，没有你之前的数据噢，如果有疑问请联系我们，可以在操作手册中看到联系开发者的方式"
            };
        }
    } catch (err) {
        logger.error(`获取steamID为${steamId}的玩家信息失败:${err}`);
        return {
            code: 400,
            message: "恢复数据失败, 请检查网络连接"
        };
    }
});

/* ============ 窗口相关IPC处理器 ============
 * 主要是玩家窗口监控和Electron窗口打开、关闭等。
 */

/**
 *  获取分辨率
 */
ipcMain.handle("get-screen-resolution", (_: IpcMainInvokeEvent): Response<{width: number, height: number, scaleFactor: number}> => {
    const { width, height } = screen.getPrimaryDisplay().bounds;
    const scaleFactor = screen.getPrimaryDisplay().scaleFactor;
    const scaledWidth = width * scaleFactor;
    const scaledHeight = height * scaleFactor;
    return {
        code: 200,
        data: { width: scaledWidth, height: scaledHeight, scaleFactor: scaleFactor }
    } as Response<{width: number, height: number, scaleFactor: number}>;
})

/**
 * 启动窗口监控
 * @param interval 监控间隔，默认1000ms
 */
ipcMain.handle("window-monitor-start", async (_: IpcMainInvokeEvent, interval: number = 1000): Promise<Response<void>> => {
    try {
        await windowMonitor.start(interval);
        return {
            code: 200,
            message: "窗口监控启动成功"
        } as Response<void>;
    } catch (error) {
        logger.error(`启动窗口监控失败: ${error}`);
        return {
            code: 400,
            message: "启动窗口监控失败"
        } as Response<void>;
    }
})

/**
 * 停止窗口监控
 */
ipcMain.handle("window-monitor-stop", (_: IpcMainInvokeEvent): Response<void> => {
    try {
        windowMonitor.stop();
        return {
            code: 200,
            message: "窗口监控停止成功"
        } as Response<void>;
    } catch (error) {
        logger.error(`停止窗口监控失败: ${error}`);
        return {
            code: 400,
            message: "停止窗口监控失败"
        } as Response<void>;
    }
})

/**
 * 获取窗口监控状态
 */
ipcMain.handle("window-monitor-status", (_: IpcMainInvokeEvent): Response<{isRunning: boolean, interval: number}> => {
    try {
        const isRunning = windowMonitor.isMonitoring();
        const interval = windowMonitor.getInterval();

        return {
            code: 200,
            message: "获取窗口监控状态成功",
            data: { isRunning, interval }
        } as Response<{isRunning: boolean, interval: number}>;
    } catch (error) {
        logger.error(`获取窗口监控状态失败: ${error}`);
        return {
            code: 400,
            message: "获取窗口监控状态失败"
        } as Response<{isRunning: boolean, interval: number}>;
    }
})

/**
 * 获取当前所有打开的窗口
 */
ipcMain.handle("window-monitor-get-windows", (_: IpcMainInvokeEvent): Response<WindowInfo[]> => {
    try {
        const windows = windowMonitor.getCurrentWindows();
        return {
            code: 200,
            message: "获取窗口列表成功",
            data: windows
        } as Response<WindowInfo[]>;
    } catch (error) {
        logger.error(`获取窗口列表失败: ${error}`);
        return {
            code: 400,
            message: "获取窗口列表失败"
        } as Response<WindowInfo[]>;
    }
})

/**
 * 设置监控间隔
 * @param interval 新的监控间隔
 */
ipcMain.handle("window-monitor-set-interval", (_: IpcMainInvokeEvent, interval: number): Response<void> => {
    try {
        windowMonitor.setInterval(interval);
        return {
            code: 200,
            message: "设置监控间隔成功"
        } as Response<void>;
    } catch (error) {
        logger.error(`设置监控间隔失败: ${error}`);
        return {
            code: 400,
            message: "设置监控间隔失败"
        } as Response<void>;
    }
})

// 设置窗口监控事件监听器，将事件转发给渲染进程
windowMonitor.on('window-opened', (event: WindowEvent) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
        mainWindow.webContents.send('window-opened', event);
    }
});

windowMonitor.on('window-closed', (event: WindowEvent) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
        mainWindow.webContents.send('window-closed', event);
    }
});

windowMonitor.on('window-changed', (event: WindowEvent) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
        mainWindow.webContents.send('window-changed', event);
    }
});

/**
 * 打开新窗口
 * @param route 路由路径
 * @param {number} width 新开窗口的宽度，默认400
 * @param {number} height 新开窗口的高度，默认580
 * @returns 打开窗口成功或失败
 */
ipcMain.handle("open-new-window", (_: IpcMainInvokeEvent, route: string, width: number = 400, height: number = 580): Response<void> => {
    try {
        const mainWindow: BrowserWindow | null = getMainWindow();
        if (!mainWindow) throw new NotFoundError("主窗口未找到");
        const mainWindowID: number = mainWindow.id;
        const currentWindowNum: number = BrowserWindow.getAllWindows().length;
        // 最多只能一个主窗口 + 一个新窗口
        if (currentWindowNum > 1) {
            const currentWindows: BrowserWindow[] = BrowserWindow.getAllWindows();
            for (const win of currentWindows) {
                if (win.id !== mainWindowID) win.close();
            }
        }

        const newWindow = new BrowserWindow({
            width: width,
            height: height,
            resizable: false,
            frame: false,
            transparent: false,
            alwaysOnTop: false,
            show: false,
            modal: false, // 确保不是模态窗口
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                contextIsolation: true,
                nodeIntegration: true,
                webgl: true
            },
        });

        newWindow.once('ready-to-show', () => {
            newWindow.show();
        });

        // 加载指定路由的页面
        if (is.dev) {
            newWindow.loadURL(`http://localhost:5173/#${route}`);
            newWindow.webContents.openDevTools({ mode: 'detach' });
        } else {
            newWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
                hash: route
            });
        }

        logger.info(`成功打开新窗口，路由: ${route}`);
        return {
            code: 200,
            message: "打开新窗口成功"
        } as Response<void>;
    } catch (error) {
        logger.error(`打开新窗口失败: ${error}`);
        return {
            code: 400,
            message: "打开新窗口失败"
        } as Response<void>;
    }
});

/**
 * 谁发的关闭窗口请求，就关闭谁
 * @param event 事件对象
 */
ipcMain.on("close-window", (event: IpcMainEvent): void => {
    const win: BrowserWindow | null = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
});

ipcMain.handle("open-opt", (_: IpcMainInvokeEvent) => {
    try {
        let htmlPath: string;

        if (is.dev) {
            // 开发环境：直接使用相对路径
            htmlPath = path.join(__dirname, '../../resources/html/opt.html');
        } else {
            // 打包环境：使用 extraResources，文件在 resources/html/ 目录
            htmlPath = path.join(process.resourcesPath, 'html/opt.html');
        }

        // 检查文件是否存在
        if (!fs.existsSync(htmlPath)) {
            logger.error(`操作手册文件不存在: ${htmlPath}, 尝试的路径: ${htmlPath}, process.resourcesPath: ${process.resourcesPath}`);
            return;
        }
        const fileUrl = "file://" + htmlPath;
        shell.openExternal(fileUrl);
    } catch (error) {
        logger.error("打开操作手册失败:", error);
    }
})
