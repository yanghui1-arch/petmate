import Store from 'electron-store';
import logger  from './log';
import { ChatLLMConfigError, LLMConfigError, TTSProcessError } from './error';
import { OpenAI } from 'openai';
import { ChatCompletionStream } from 'openai/resources/chat/completions';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import { getMainWindow } from './index';

type StoreData = {
    chatLLMConfig: ChatLLMConfig;
    ttsLLMConfig: TTSLLMConfig;
}

const store: Store<StoreData> = new Store<StoreData>({
    name: 'llm'
})

export interface ChatLLMConfig {
    model: string;
    apiKey: string;
    baseUrl: string;
}

export interface TTSLLMConfig {
    model: string;
    apiKey: string;
    baseUrl: string;
    parameters: TTSParameters;
}

export interface TTSParameters {
    text_type?: string;
    voice: string;
    format: string;
    sample_rate: number;
    volume: number;
    rate: number; // 语速
    pitch: number; // 音调
}

export interface ChatMessage {
    role: "assistant" | "user" | "system";
    content: string;
}

/**
 * 聊天消息工厂类
 * 负责直接创建ChatMessage对象，如果是用户消息，则role直接指定user，如果是assistant消息，则role直接指定为assistant，如果是系统消息，则role直接指定为system
 */
class ChatMessageFactory {
    static asUser(content: string): ChatMessage {
        return {
            role: "user",
            content: content
        }
    }

    static asAssistant(content: string): ChatMessage {
        return {
            role: "assistant",
            content: content
        }
    }

    static asSystem(content: string): ChatMessage {
        return {
            role: "system",
            content: content
        }
    }

}

const DEFAULT_CHAT_LLM_CONFIG: ChatLLMConfig = {
    model: 'qwen2.5-7b-instruct-1m',
    apiKey: 'sk-93ce6cc609864f199c39a479f2f50c1d',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
}

const DEFAULT_TTS_PARAMETERS: TTSParameters = {
    text_type: 'PlainText',
    voice: 'longxiaochun_v2',
    format: 'mp3',
    sample_rate: 22050,
    volume: 50,
    rate: 1,
    pitch: 1
}

const DEFAULT_TTS_LLM_CONFIG: TTSLLMConfig = {
    model: 'cosyvoice-v2',
    apiKey: 'sk-93ce6cc609864f199c39a479f2f50c1d',
    baseUrl: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/',
    parameters: DEFAULT_TTS_PARAMETERS
}

// config
let currentChatLLMConfig: ChatLLMConfig = DEFAULT_CHAT_LLM_CONFIG;
let currentTTSLLMConfig: TTSLLMConfig = DEFAULT_TTS_LLM_CONFIG;

// chat client
let chatClient: OpenAI | null = null;

// chat history message
let chatHistoryMessages: ChatMessage[] = [];

// tts websocket
let ttsWebsocket: WebSocket | null = null;
let ttsStarted: boolean = false;
let ttsTaskId: string | null = null;



interface TTSStartTask {
    header: {
        action: string;
        task_id: string;
        streaming: "duplex";
    };
    payload: {
        task_group: string;
        task: string;
        function: string;
        model: string;
        parameters: {
            text_type: string;
            voice: string;
            format: string;
            sample_rate: number;
            volume: number;
            rate: number;
            pitch: number;
        };
        input: {}
    }
}

interface TTSContinueTask {
    header: {
        action: string;
        task_id: string;
        streaming: "duplex";
    };
    payload: {
        input: {
            text: string;
        }
    }
}

interface TTSFinishTask {
    header: {
        action: string;
        task_id: string;
        streaming: "duplex";
    };
    payload: {
        input: {} // 空
    }
}


/**
 * 初始化所有大模型的客户端
 */
function initLLMClient(): void {
    try {
        initLLMConfig();
        // 初始化
        // 文本
        chatClient = new OpenAI({
            baseURL: currentChatLLMConfig.baseUrl,
            apiKey: currentChatLLMConfig.apiKey
        })
        // tts

    } catch (error) {
        if (error instanceof LLMConfigError) {
            logger.error('[llm] 大模型配置错误，请在设置中配置');
        } else {
            logger.error('[llm] 大模型客户端初始化失败', error);
        }
    }
}

/**
 * 初始化所有大模型的模型配置
 * 如果模型配置有一个有问题，则初始化失败，会抛出异常的
 * @throws LLMConfigError 如果模型未设置API密钥或API地址
 */
function initLLMConfig(): void {
    const chatLLMConfig: ChatLLMConfig = getChatLLMConfig();
    const ttsLLMConfig: TTSLLMConfig = getTTSLLMConfig();
    if (chatLLMConfig.apiKey === '' || ttsLLMConfig.apiKey === '') {
        logger.error('[llm] 未设置API密钥，请在设置中配置');
        throw new LLMConfigError('未设置API密钥');
    }
    if (chatLLMConfig.baseUrl === '' || ttsLLMConfig.baseUrl === '') {
        logger.error('[llm] 未设置API地址，请在设置中配置');
        throw new LLMConfigError('未设置API地址');
    }
    currentChatLLMConfig = chatLLMConfig;
    currentTTSLLMConfig = ttsLLMConfig;
    logger.info('[llm] 大模型配置初始化成功');
}

/**
 * 获取ChatLLM的配置
 * 如果未设置，则使用默认配置
 * @returns ChatLLM的配置
 */
function getChatLLMConfig(): ChatLLMConfig {
    const customConfig =  (store as any).get('chatLLMConfig') as ChatLLMConfig;
    if (!customConfig) {
        logger.info('[llm] 未找到自定义的ChatLLM配置，使用默认配置');
        setChatLLMConfig(DEFAULT_CHAT_LLM_CONFIG);
        return DEFAULT_CHAT_LLM_CONFIG;
    }
    return customConfig;
}

/**
 * 获取TTSLLM的配置
 * 如果未设置，则使用默认配置
 * @returns TTSLLM的配置
 */
function getTTSLLMConfig(): TTSLLMConfig {
    const customConfig = (store as any).get('ttsLLMConfig') as TTSLLMConfig;
    if (!customConfig) {
        logger.info('[llm] 未找到自定义的TTSLLM配置，使用默认配置');
        setTTSLLMConfig(DEFAULT_TTS_LLM_CONFIG);
        return DEFAULT_TTS_LLM_CONFIG;
    }
    return customConfig;
}

/**
 * 设置ChatLLM的配置
 * @param config 新的ChatLLM配置
 * @returns 设置后的ChatLLM配置
 */
function setChatLLMConfig(config: ChatLLMConfig): ChatLLMConfig {
    (store as any).set('chatLLMConfig', config);
    currentChatLLMConfig = config;
    chatClient = new OpenAI({
        baseURL: currentChatLLMConfig.baseUrl,
        apiKey: currentChatLLMConfig.apiKey
    })
    logger.info("[llm] 文本大模型的客户端已重新初始化")
    return config;
}

/**
 * 设置TTSLLM的配置
 * @param config 新的TTSLLM配置
 * @returns 设置后的TTSLLM配置
 */
function setTTSLLMConfig(config: TTSLLMConfig): TTSLLMConfig {
    const customConfig = (store as any).set('ttsLLMConfig', config);
    currentTTSLLMConfig = config;
    return config;
}

/**
 * 向模型提供方发送信息，并获取回复
 * @param messages 聊天信息
 * @returns 聊天信息流
 * @throws LLMConfigError 如果文本大模型客户端未初始化
 */
async function postChatMessage(messages: ChatMessage[]): Promise<ChatCompletionStream> {
    if (!chatClient) {
        throw new LLMConfigError('文本大模型客户端未初始化');
    }
    const completion = await chatClient.chat.completions.stream({
        model: currentChatLLMConfig.model,
        messages: messages,
    })
    return completion;
}

/**
 * 发送tts任务
 * @param text 要tts的文本
 */
function tts(text: string): void {
    if (!ttsStarted || !ttsWebsocket || !ttsTaskId) {
        throw new TTSProcessError(`tts任务未初始化，请保证ttsStarted、ttsWebsocket、ttsTaskId均是正确的，现在的ttsStarted=${ttsStarted}，ttsWebsocket=${ttsWebsocket}，ttsTaskId=${ttsTaskId}`);
    }
    const continueTaskMessage: TTSContinueTask = {
        header: {
            action: 'continue-task',
            task_id: ttsTaskId,
            streaming: 'duplex'
        },
        payload: {
            input: {
                text: text
            }
        }
    }
    console.log(`tts task id: ${ttsTaskId}`);
    ttsWebsocket?.send(JSON.stringify(continueTaskMessage));
    console.log('已发送继续任务的事件');
}

/**
 * 连接TTS的websocket
 * @returns 任务id
 */
function connectTTSWebsocket(): string {
    ttsWebsocket = new WebSocket(currentTTSLLMConfig.baseUrl, {
        headers: {
            Authorization: `bearer ${currentTTSLLMConfig.apiKey}`,
            'X-DashScope-DataInspection': 'enable'
        }
    });
    const taskId = uuidv4();
    console.log(`init tts websocket task id: ${taskId}`);
    ttsWebsocket.on('open', () => {
        console.log('已连接到WebSocket服务器');
        const runTaskMessage: TTSStartTask = {
            header: {
                action: 'run-task',
                task_id: taskId,
                streaming: 'duplex'
            },
            payload: {
                task_group: 'audio',
                task: 'tts',
                function: 'SpeechSynthesizer',
                model: 'cosyvoice-v2',
                parameters: {
                    text_type: 'PlainText',
                    voice: currentTTSLLMConfig.parameters.voice, // 音色
                    format: currentTTSLLMConfig.parameters.format, // 音频格式
                    sample_rate: currentTTSLLMConfig.parameters.sample_rate, // 采样率
                    volume: currentTTSLLMConfig.parameters.volume, // 音量
                    rate: currentTTSLLMConfig.parameters.rate, // 语速
                    pitch: currentTTSLLMConfig.parameters.pitch // 音调
                },
                input: {}
            }
        };
        ttsWebsocket?.send(JSON.stringify(runTaskMessage));
        console.log('已发送开始任务的事件');
    });

    ttsWebsocket.on('message', (data, isBinary) => {
        // 如果是二进制，则为音频数据
        if (isBinary) {
            // 发给渲染层
            const mainWindow = getMainWindow();
            if (mainWindow) {
                // 发送tts转录buffer数据
                mainWindow.webContents.send('tts-audio-chunk', data);
            }
        } else {
            const message = JSON.parse(data.toString());
            switch (message.header.event) {
                case "task-started":
                    ttsStarted = true;
                    console.log('tts任务已经准备开始');
                    break;
                case 'task-finished':
                    console.log('tts任务已全部完成');
                    // 通知渲染进程TTS结束
                    const finishWindow = getMainWindow();
                    if (finishWindow) {
                        finishWindow.webContents.send('tts-finished');
                    }
                    ttsWebsocket?.close();
                    ttsStarted = false;
                    ttsTaskId = null;
                    break;
                case 'task-failed':
                    logger.error('[llm] tts任务失败');
                    // 通知渲染进程TTS失败
                    const failWindow = getMainWindow();
                    if (failWindow) {
                        failWindow.webContents.send('tts-failed', message);
                    }
                    ttsWebsocket?.close();
                    ttsStarted = false;
                    break;
                default:
                    break;
            }
        }
    });

    ttsWebsocket.on('error', (error) => {
        console.error('[llm] tts websocket 连接错误', error);
    });

    ttsWebsocket.on('close', () => {
        ttsStarted = false;
        ttsTaskId = null;
        ttsWebsocket = null;
        console.log('[llm] tts websocket 连接已关闭');
    });

    return taskId;
}

/**
 * 等待TTS任务准备就绪
 * @param timeout 超时时间（毫秒），默认5秒
 * @returns Promise<boolean> 是否成功准备就绪
 */
function waitForTTSReady(timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
        // 如果已经准备就绪，直接返回
        if (ttsStarted && ttsWebsocket && ttsTaskId) {
            resolve(true);
            return;
        }

        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            // 检查是否已经准备就绪
            if (ttsStarted && ttsWebsocket && ttsTaskId) {
                clearInterval(checkInterval);
                resolve(true);
                return;
            }

            // 检查是否超时
            if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                resolve(false);
                return;
            }
        }, 50); // 每50ms检查一次
    });
}

/**
 * 发送聊天信息
 * 会向渲染进程发送音频信息和文本信息，其中文本信息会以流的形式发送，音频信息会以二进制流的形式发送
 * 文本信息流和音频信息流是几乎同步发送的
 * chat-chunk为文本信息流的参数，tts-audio-chunk为音频信息流的参数
 * @param messages 聊天信息
 * @throws TTSProcessError 如果tts任务的参数未正确初始化
 * @throws ChatLLMConfigError 如果传过来的聊天信息不是用户消息
 * @throws LLMConfigError 如果大模型配置错误
 */
async function chat(message: ChatMessage): Promise<void> {
    try {
        // 如果websocket没建立连接，先建立一下连接
        if (!ttsWebsocket && !ttsStarted) {
            ttsTaskId = connectTTSWebsocket();
        }
        if (message.role !== 'user') {
            throw new ChatLLMConfigError("[llm] 请确保传过来的聊天信息是用户消息");
        }
        // 等待TTS任务准备就绪
        // 必须得保证TTS任务准备就绪，不然会因为websocket的异步性导致ttsStarted=False
        const ttsReady = await waitForTTSReady();
        if (!ttsReady) {
            throw new TTSProcessError('TTS任务初始化超时，请检查网络连接和API配置');
        }

        // 建立好连接并确认好用户信息之后，将当前的聊天信息加入到历史聊天信息中
        chatHistoryMessages.push(message);
        // [future] 得在这里再考虑一下上下文长度问题，但这一个版本先不考虑
        
        const mainWindow = getMainWindow()
        const runner: ChatCompletionStream = await postChatMessage(chatHistoryMessages);
        let response: string = "";
        for await (const chunk of runner) {
            const content = chunk.choices[0].delta.content ?? "";
            console.log("文本流", content);
            if (content !== "") {
                tts(content);
                response += content;
                mainWindow?.webContents.send('chat-chunk', content);
            }
        }
        
        // 将回复信息加入到历史聊天信息中
        chatHistoryMessages.push(ChatMessageFactory.asAssistant(response));

        // 发送一个finished task事件
        if (!ttsTaskId) throw new TTSProcessError('无法正确获取tts任务id，导致无法发送finished task事件');

        const finishTaskMessage: TTSFinishTask = {
            header: {
                action: 'finish-task',
                task_id: ttsTaskId,
                streaming: 'duplex'
            },
            payload: {
                input: {}
            }
        }
        ttsWebsocket?.send(JSON.stringify(finishTaskMessage));
    } catch (error) {
        ttsTaskId = null;
        ttsStarted = false;
        ttsWebsocket?.close();
        ttsWebsocket = null;
        throw error;
    }
}

initLLMClient();
export {
    chat,
    
    // config
    setChatLLMConfig,
    setTTSLLMConfig,
}