/**
 * 暴露ipc事件
 */

import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { playerManager } from './modules/store';
import { PlayerInfo } from './types/player';
import { Response } from '../types/response';
import { consumeItem } from './modules/player/basic';
import logger from './log';
import { PetMate } from './modules/petmate/petmate';
import { endActivity } from './modules/player/act';
import { ActiveBuff } from './types/buff';
import { MAX_WISHES_STORE_NUM } from './constant';
import { Wish } from './types/wish';
import { Item, ItemType } from './types/item';
import { buyItem } from './modules/player/basic';
import { ActivityInfo } from './types/activity';
import { getCompletedWishesNum, showActivities, showItems } from './modules/show';
import { ChatLLMConfigError, LLMConfigError, NotFoundError, TTSProcessError, UnsupportedError } from './error';
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
    clearChatHistoryMessages
} from './llm';

/**
 * 初始化加载玩家数据
 * 会检查每一个petmate的Buff是否过期，如果过期了则删除，如果没过期则设置一个定时器
 * 会检查每一个petmate的活动是否完成，如果完成了则结束活动并结算奖励，如果没完成则设置一个定时器
 * 会检查每一个petmate的心愿信息的数量是否超过了支持的最大心愿数量，如果超过了则按照心愿的开始时间，将之前的心愿删除
 * 会同步文件中的数据
 * @returns 加载玩家数据成功或失败，如果失败会返回一个code=400的响应，如果成功会返回一个code=200的响应，并且返回玩家信息
 */
ipcMain.handle("load-player-data", (event: IpcMainInvokeEvent): Response<PlayerInfo> => {
    try {
        const playerInfo:PlayerInfo = playerManager.getPlayer();
        const petmates: PetMate[] = playerInfo.petmates;
        // 检查每一个petmate的Buff是否过期
        petmates.forEach(petmate => {
            const allActiveBuffs: ActiveBuff[] = petmate.getActiveBuffs();
            allActiveBuffs.forEach(activeBuff => {
                // 如果已经过期了那就直接删除，没过期的那就继续设置一个定时器
                if (activeBuff.endTime < new Date()) {
                    petmate.removeBuff(activeBuff.id);
                } else {
                    const remainedTime: Date = new Date(activeBuff.endTime.getTime() - new Date().getTime());
                    setTimeout(() => {
                        petmate.removeBuff(activeBuff.id);
                    }, remainedTime.getTime());
                }
            })
        })
        
        // 检查活动是否完成
        petmates.forEach(petmate => {
            // 如果在活动中，先查看一下是否完成了活动（玩家会开始活动然后又退出游戏）
            if (petmate.status.status !== "idle") {
                const currentTime: Date = new Date();
                /**
                 * 结束活动
                 * 如果活动已经结束，则结束活动结算奖励并且同步petmate状态
                 * 如果活动还没结束，则开启延迟任务
                 */
                if (currentTime >= (petmate.status.endTime ?? new Date())) {
                    const endSuccess: boolean = endActivity(petmate.id);
                    if (endSuccess) {
                        logger.info("初始化玩家数据时，结束早已结束的活动成功。")
                    } else {
                        throw new Error("结束活动失败");
                    }
                } else {
                    if (petmate.status.endTime) {
                        const remainedTime: Date = new Date(petmate.status.endTime.getTime() - currentTime.getTime());
                        // 开启延迟任务
                        setTimeout(() => {
                            const endSuccess: boolean = endActivity(petmate.id);
                            if (endSuccess) {
                                logger.info("初始化玩家数据时，结束早已结束的活动成功。")
                            } else {
                                throw new Error("结束活动失败");
                            }
                        }, remainedTime.getTime());
                    }
                }
            }
        })

        // 检查petmate的心愿信息的数量是否超过了支持的最大心愿数量
        petmates.forEach(petmate => {
            // 如果超过了，则按照心愿的开始时间，将之前的心愿删除
            if (petmate.wishes.length > MAX_WISHES_STORE_NUM) {
                const toDeleteWishesNum: number = petmate.wishes.length - MAX_WISHES_STORE_NUM;
                const sortedWishes: Wish[] = petmate.wishes.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
                const toDeleteWishes: Wish[] = sortedWishes.slice(0, toDeleteWishesNum);
                toDeleteWishes.forEach(wish => {
                    petmate.removeWish(wish.id);
                })
            }
        })

        // 同步文件操作
        petmates.forEach(petmate => {
            playerManager.updatePetmate(petmate);
        })
        
        return {
            code: 200,
            data: playerInfo
        } as Response<PlayerInfo>;   
    } catch (error) {
        logger.error(`加载玩家数据失败: ${error}`);
        return {
            code: 400,
            message: "加载数据失败"
        } as Response<PlayerInfo>;
    }
})

/**
 * 初始化设置数据
 * 将玩家自定义的设置数据加载到内存中，如果玩家没有自定义的设置数据，则初始化默认设置，并写入到自定义的设置数据中
 * @returns 玩家自定义的设置数据
 */
ipcMain.handle("init-settings", (event: IpcMainInvokeEvent): Response<SettingConfig> => {
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
ipcMain.handle("init-llm", (event: IpcMainInvokeEvent): Response<void> => {
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

/**
 * 消耗物品
 * @param itemId 物品id
 * @param count 消耗数量
 * @param petmateId petmate的id
 * @returns 消耗物品成功或失败
 */
ipcMain.handle("consume-item", (event: IpcMainInvokeEvent, itemId: number, count: number, petmateId: number): Response<void> => {
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

/**
 * 购买物品
 * @param itemId 物品id
 * @param count 购买数量
 * @returns 购买的物品
 */
ipcMain.handle("buy-item", (event: IpcMainInvokeEvent, itemId: number, count: number): Response<Item> => {
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
ipcMain.handle("clone-voice", async (event: IpcMainInvokeEvent, url: string): Promise<Response<string>> => {
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
        await listenTTSVoiceSample(voice, text);
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
ipcMain.handle("chat", async (event: IpcMainInvokeEvent, message: ChatMessage): Promise<Response<void>> => {
    try {
        await chat(message);
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
                message: "发送聊天信息失败"
            } as Response<void>;
        } else if (error instanceof TTSProcessError) {
            logger.error(`发送聊天信息失败，TTS参数未正确初始化: ${error}`);
            return {
                code: 400,
                message: "发送聊天信息失败"
            } as Response<void>;
        } else if ((error as Error).message === 'Invalid string length') {
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
ipcMain.handle("show-activities", (event: IpcMainInvokeEvent, type: ActivityInfo["type"]): Response<ActivityInfo[]> => {
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
 * 获取物品
 * @param type 物品类型
 * @returns 物品列表
 */
ipcMain.handle("show-items", (event: IpcMainInvokeEvent, type: ItemType): Response<Item[]> => {
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
 * 获取完成petmate的心愿数量
 * @param petmateId petmate的id
 * @returns 完成的心愿数量
 */
ipcMain.handle("get-petmate-completed-wishes-num", (event: IpcMainInvokeEvent, petmateId: number): Response<number> => {
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
ipcMain.handle("get-petmate-one-wish", (event: IpcMainInvokeEvent, petmateId: number, wishId: string): Response<Wish> => {
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
 * 获取模型大小
 * @returns 模型大小
 */
ipcMain.handle("get-model-size", (event: IpcMainInvokeEvent): Response<number> => {
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
ipcMain.handle("get-settings", (event: IpcMainInvokeEvent): Response<SettingConfig> => {
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
ipcMain.handle("get-chat-llm-config", (event: IpcMainInvokeEvent): Response<ChatLLMConfig> => {
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
ipcMain.handle("get-chat-prompt", (event: IpcMainInvokeEvent): Response<string> => {
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
 * 获取TTS LLM配置
 * @returns TTS LLM配置, 如果失败的话则返回一个错误信息
 */
ipcMain.handle("get-tts-config", (event: IpcMainInvokeEvent): Response<TTSLLMConfig> => {
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
ipcMain.handle("get-tts-voice-list", (event: IpcMainInvokeEvent): Response<TTSVoice[]> => {
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
ipcMain.handle("set-chat-llm-config", (event: IpcMainInvokeEvent, config: ChatLLMConfig): Response<ChatLLMConfig> => {
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
ipcMain.handle("set-chat-prompt", (event: IpcMainInvokeEvent, prompt: string): Response<void> => {
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
ipcMain.handle("save-chat-messages", (event: IpcMainInvokeEvent): Response<void> => {
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
ipcMain.handle("set-tts-config", (event: IpcMainInvokeEvent, config: TTSLLMConfig): Response<TTSLLMConfig> => {
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
ipcMain.handle("add-tts-voice", (event: IpcMainInvokeEvent, voice: TTSVoice): Response<void> => {
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
ipcMain.handle("update-settings", (event: IpcMainInvokeEvent, settings: Partial<SettingConfig>): Response<void> => {
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