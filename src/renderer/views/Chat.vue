<template>
    <div class="chat-container">
        <div class="chat-header">
            <span style="font-family: Petmate; font-size: 30px">Dass Chat</span>
            <n-switch :value="isMuted" @update:value="changeMuted"/>
        </div>
        
        <!-- 聊天消息显示区域 -->
        <div class="chat-content" ref="chatContentRef">
            <div 
                v-for="(message, index) in messages" 
                :key="index" 
                class="message-wrapper"
                :class="message.role === 'user' ? 'user-message' : 'assistant-message'"
            >
                <!-- Assistant Avatar (left side) -->
                <div v-if="message.role === 'assistant'" class="avatar">
                    <img src="../assets/image/petmate-1.jpg" alt="Dass Avatar" />
                    <div class="avatar-glow"></div>
                </div>
                
                <div class="message-container">
                    <div class="message-time">{{ formatTime(message.timestamp) }}</div>
                    <div class="message-bubble" :class="{ 'typing': message.isLoading }">
                        <div class="message-background"></div>
                        
                        <!-- Show typing indicator when loading -->
                        <div v-if="message.isLoading" class="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        
                        <!-- Show content when not loading -->
                        <div v-else class="message-content" :class="{ 'content-typing': message.isTyping }">
                            {{ message.content }}
                        </div>
                        
                        <div class="message-shimmer"></div>
                    </div>
                </div>
                
                <!-- User Avatar (right side) -->
                <div v-if="message.role === 'user'" class="avatar">
                    <img src="../assets/image/petmate-3.jpg" alt="User Avatar" />
                    <div class="avatar-glow"></div>
                </div>
            </div>
        </div>

        <!-- 聊天输入框 -->
        <div class="chat-footer">
            <n-input
                v-model:value="inputMessage"
                size="small"
                placeholder="和 Dass 聊聊吧ヾ(≧▽≦*)o" 
                type="textarea"
                :autosize="{ minRows: 1, maxRows: 3 }"
                @keydown="handleEnter"
                style="width: 85%; border-radius: 10px;"
                :disabled="loading || isTyping"
            />

            <n-button 
                color="#55484b"
                size="large" 
                :loading="loading"
                :disabled="loading || isTyping || !inputMessage.trim()"
                :keyboard="true"
                circle
                @click="handleSend"
            >
                {{ buttonStatus }}
            </n-button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { usePlayer } from '../hooks/usePlayer';
import type { ChatMessage } from '../types/llm';
import { useAudio } from '../hooks/useAudio';


// 扩展的消息接口，包含时间戳
interface ChatMessageWithTimestamp extends ChatMessage {
    timestamp: Date;
    isLoading?: boolean;
    isTyping?: boolean;
}

const { chat } = usePlayer();

// 响应式数据
const messages = ref<ChatMessageWithTimestamp[]>([]);
const inputMessage = ref('');
const buttonStatus = ref('↑');
const loading = ref(false);
const isTyping = ref(false); // 是否正在打字输出
const chatContentRef = ref<HTMLElement | null>(null);

// Stream processing
let currentAssistantMessageIndex = -1;
let streamBuffer = '';
let streamCheckInterval: NodeJS.Timeout | null = null;
let lastChunkTime = 0;

// Chunk processing queue for smooth streaming
let chunkQueue: string[] = [];
let isProcessingChunks = false;


// 格式化时间显示
const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

// 滚动到底部
const scrollToBottom = async () => {
    await nextTick();
    if (chatContentRef.value) {
        chatContentRef.value.scrollTop = chatContentRef.value.scrollHeight;
    }
};

// 添加消息到聊天记录
const addMessage = (role: ChatMessage['role'], content: string) => {
    const newMessage: ChatMessageWithTimestamp = {
        role,
        content,
        timestamp: new Date()
    };
    messages.value.push(newMessage);
    
    // Immediate scroll for real-time feedback
    scrollToBottom();
};

// 处理单个流式文本块
const processChunk = async (chunk: string) => {
    if (currentAssistantMessageIndex < 0 || currentAssistantMessageIndex >= messages.value.length) {
        return;
    }

    // Add chunk to buffer
    streamBuffer += chunk;
    
    // If message is still loading, start typing mode
    if (messages.value[currentAssistantMessageIndex].isLoading) {
        messages.value[currentAssistantMessageIndex].isLoading = false;
        messages.value[currentAssistantMessageIndex].isTyping = true;
        messages.value[currentAssistantMessageIndex].content = '';
        await nextTick();
        await scrollToBottom();
    }

    // Update content in real-time with typing effect
    messages.value[currentAssistantMessageIndex].content = streamBuffer;
    
    // Force immediate DOM update and scroll
    await nextTick();
    await scrollToBottom();
    
    // Update the last chunk time
    lastChunkTime = Date.now();
};

// 处理文本块队列，带延迟以实现流式效果
const processChunkQueue = async () => {
    if (isProcessingChunks) return;
    
    isProcessingChunks = true;
    
    while (chunkQueue.length > 0) {
        const chunk = chunkQueue.shift();
        if (chunk) {
            await processChunk(chunk);
            // Add small delay between chunks for visible streaming effect
            await new Promise(resolve => setTimeout(resolve, 30));
        }
    }
    
    isProcessingChunks = false;
};

// 添加文本块到队列
const handleTextChunk = (chunk: string) => {
    chunkQueue.push(chunk);
    processChunkQueue();
};

// 完成流式响应
const finishStreamResponse = async () => {
    if (currentAssistantMessageIndex >= 0 && currentAssistantMessageIndex < messages.value.length) {
        messages.value[currentAssistantMessageIndex].isTyping = false;
    }
    
    // Reset all state
    currentAssistantMessageIndex = -1;
    streamBuffer = '';
    lastChunkTime = 0;
    isTyping.value = false;
    loading.value = false;
    buttonStatus.value = '↑';
    
    // Clear chunk queue and processing state
    chunkQueue = [];
    isProcessingChunks = false;
    
    // Clear interval if exists
    if (streamCheckInterval) {
        clearInterval(streamCheckInterval);
        streamCheckInterval = null;
    }
    
    await scrollToBottom();
};

// 创建等待回复的消息
const createPendingAssistantMessage = (): number => {
    const newMessage: ChatMessageWithTimestamp = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
        isTyping: false
    };
    messages.value.push(newMessage);
    scrollToBottom();
    return messages.value.length - 1;
};

// 设置流检测器，在没有新文本块时结束流
const setupStreamChecker = () => {
    // 清除之前的定时器
    if (streamCheckInterval) {
        clearInterval(streamCheckInterval);
        streamCheckInterval = null;
    }
    
    // 初始化时间
    lastChunkTime = Date.now();
    
    // 设置新的定时器检查流是否结束
    streamCheckInterval = setInterval(() => {
        if (Date.now() - lastChunkTime > 1000) { // 1秒没有新块就认为结束
            clearInterval(streamCheckInterval!);
            streamCheckInterval = null;
            finishStreamResponse();
        }
    }, 500);
};

// 发送消息处理
const handleSend = async () => {
    const message = inputMessage.value.trim();
    if (!message || loading.value || isTyping.value) return;

    loading.value = true;
    buttonStatus.value = '';

    try {
        // 添加用户消息
        addMessage('user', message);
        
        // 清空输入框
        inputMessage.value = '';

        // 创建等待中的助手消息
        currentAssistantMessageIndex = createPendingAssistantMessage();
        streamBuffer = '';

        // 创建聊天消息对象
        const chatMessage: ChatMessage = {
            role: 'user',
            content: message
        };

        // 发送消息到主进程
        const success = await chat(chatMessage);
        
        if (success) {
            // 如果发送成功，开始接收流式回复
            isTyping.value = true;
            loading.value = false; // Hide loading, ready for streaming
            // 为这次聊天设置流检测器
            setupStreamChecker();
        } else {
            // 发送失败的处理 - 更新等待中的消息为错误状态
            if (currentAssistantMessageIndex >= 0) {
                messages.value[currentAssistantMessageIndex].isLoading = false;
                messages.value[currentAssistantMessageIndex].content = '请保证你聊天LLM的base_url和api_key都是正确的。你可以点击左上角 -> 配置 -> 聊天LLM 中进行查看。内容可能包含黄色内容，你可能需要更改说话风格以实现越狱效果。';
            }
            // 重置状态
            finishStreamResponse();
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        // 错误处理 - 如果有等待中的消息，更新为错误状态
        if (currentAssistantMessageIndex >= 0) {
            messages.value[currentAssistantMessageIndex].isLoading = false;
            messages.value[currentAssistantMessageIndex].content = '出现了一些问题，请稍后再试。';
        }
        // 重置状态
        finishStreamResponse();
    } finally {
        // 确保在任何情况下都重置状态（如果还没有重置的话）
        if (loading.value && !isTyping.value) {
            loading.value = false;
            buttonStatus.value = '↑';
        }
    }
};

// 处理回车键
const handleEnter = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
};

const { isMuted, initAudioResources, clearAudioResources, changeMuted } = useAudio();

// 设置事件监听器
onMounted(async () => {
    // 需要在此处初始化llm客户端
    await window.api.initLLM()

    // 监听文本流块
    window.api.onTextChunk((event: Event, text: string) => {
        console.log('Received text chunk:', text);
        handleTextChunk(text);
    });

    // 监听音频流块
    if (isMuted.value === false) {
        initAudioResources();
    }
});

watch(isMuted, (newVal) => {
    // 如果为静音就清理掉音频资源，如果非静音就初始化资源
    if (newVal === true) {
        clearAudioResources();
    } else {
        initAudioResources();
    }
});


onUnmounted(async () => {
    // 清理定时器
    if (streamCheckInterval) {
        clearInterval(streamCheckInterval);
        streamCheckInterval = null;
    }
    clearAudioResources();
    await window.api.saveChatMessages();
});


</script>

<style scoped lang="scss">
/* ==========================================
   聊天容器 - 主要布局结构
   ========================================== */
.chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: $system-bgc; // 全局系统背景色
    padding: 10px;
    box-sizing: border-box;
    
    /* ==========================================
       聊天头部 - 标题区域
       ========================================== */
    .chat-header {
        height: 60px;
        background-color: $content-bgc; // 主题内容区背景色
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        margin-bottom: 10px;
        flex-shrink: 0; // 防止头部收缩
        color: $font-light; // 浅色字体提供对比度
        box-shadow: 0 4px 24px 0 rgba(253, 203, 110, 0.15); // 温暖的金色阴影
    }
    
    /* ==========================================
       聊天内容 - 可滚动消息区域
       ========================================== */
    .chat-content {
        flex: 1; // 占用剩余空间
        overflow-y: auto; // 仅在需要时显示滚动条
        overflow-x: hidden; // 防止水平滚动
        padding: 15px;
        background-color: $content-bgc;
        border-radius: 10px;
        margin-bottom: 10px;
        display: flex;
        flex-direction: column;
        gap: 15px; // 消息之间的间距
        box-shadow: 0 4px 24px 0 rgba(253, 203, 110, 0.15);
        
        /* ==========================================
           自定义滚动条样式
           增强可见性以提升用户体验
           ========================================== */
        // 仅在内容溢出时显示的增强滚动条样式
        scrollbar-width: thin; // Firefox 浏览器
        scrollbar-color: rgba(224, 166, 166, 0.8) rgba(139, 19, 19, 0.15); // Firefox
        
        // Webkit 浏览器的自定义滚动条 (Chrome, Safari, Edge)
        &::-webkit-scrollbar {
            width: 14px; // 足够宽度便于点击
            background: rgba(139, 19, 19, 0.05); // 轨道区域的浅色背景
        }
        
        &::-webkit-scrollbar-track {
            background: rgba(139, 19, 19, 0.15); // 主题色的轨道背景
            border-radius: 7px;
            border: 1px solid rgba(224, 166, 166, 0.2);
            margin: 2px; // 添加边距以获得更好的视觉分离
        }
        
        &::-webkit-scrollbar-thumb {
            background: rgba(224, 166, 166, 0.8); // 可见的滑块颜色
            border-radius: 7px;
            border: 2px solid rgba(255, 255, 255, 0.3); // 白色边框增强定义
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            min-height: 30px; // 确保最小滑块尺寸便于使用
            
            &:hover {
                background: rgba(197, 81, 81, 0.9); // 悬停时变暗提供反馈
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
            }
            
            &:active {
                background: rgba(197, 81, 81, 1); // 拖拽时的实心颜色
            }
        }
        
        // 确保滚动条角落样式一致
        &::-webkit-scrollbar-corner {
            background: rgba(139, 19, 19, 0.15);
        }
        
        /* ==========================================
           欢迎消息 - 初始状态
           ========================================== */
        .welcome-message {
            text-align: center;
            color: $font-muted-light;
            margin-top: 20px;
            font-size: 16px;
        }
        
        /* ==========================================
           消息包装器 - 单个消息容器
           处理头像 + 消息 + 动画的布局
           ========================================== */
        .message-wrapper {
            display: flex;
            width: 100%;
            margin-bottom: 8px;
            align-items: flex-start; // 头像与消息气泡顶部对齐
            gap: 12px; // 头像和消息之间的间距
            
            // 入场动画 - 从底部平滑滑入
            animation: messageEntrance 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            opacity: 1; // 实时内容从可见状态开始
            transform: translateY(0) scale(1); // 从最终位置开始
            
            // 手动触发的可选入场动画类
            &.message-entering {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            
            /* ==========================================
               悬停效果 - 交互反馈
               ========================================== */
            &:hover {
                transform: translateY(-2px); // 微妙的提升效果
                transition: transform 0.3s ease;
                
                .avatar {
                    .avatar-glow {
                        opacity: 0.8;
                        transform: scale(1.2); // 悬停时扩展光晕
                    }
                }
                
                .message-bubble {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important; // 增强阴影
                    
                    .message-shimmer {
                        opacity: 1;
                        animation: shimmer 2s ease-in-out infinite; // 激活闪光效果
                    }
                }
            }
            
            /* ==========================================
               头像样式 - 圆形头像图片
               ========================================== */
            .avatar {
                width: 40px;
                height: 40px;
                flex-shrink: 0; // 防止头像收缩
                position: relative;
                animation: avatarBounce 0.3s ease-out; // 快速弹跳入场
                
                img {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%; // 完美圆形
                    object-fit: cover; // 裁剪图片适应圆形
                    border: 2px solid rgba(255, 255, 255, 0.9); // 白色边框增强定义
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); // 深度阴影
                    transition: all 0.3s ease;
                    position: relative;
                    z-index: 2; // 在光晕效果之上
                }
                
                // 头像后的光晕效果
                .avatar-glow {
                    position: absolute;
                    top: -5px;
                    left: -5px;
                    right: -5px;
                    bottom: -5px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(253, 203, 110, 0.4), rgba(224, 166, 166, 0.3), transparent);
                    opacity: 0; // 默认隐藏
                    transform: scale(1);
                    transition: all 0.4s ease;
                    z-index: 1; // 在头像图片之后
                    animation: pulse 3s ease-in-out infinite; // 轻柔脉动
                }
            }
            
            /* ==========================================
               消息容器 - 时间戳 + 气泡包装器
               ========================================== */
            .message-container {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                max-width: calc(85% - 52px); // 考虑头像宽度 + 间距
                
                .message-time {
                    font-size: 10px;
                    opacity: 0.5; // 微妙的时间戳
                    color: $font-muted-light;
                    margin-bottom: 4px;
                    padding: 0 4px;
                    font-weight: 400;
                    align-self: flex-start;
                    animation: fadeInDown 0.3s ease-out; // 从顶部淡入
                    animation-fill-mode: both;
                }
            }
            
            /* ==========================================
               用户消息样式 - 右对齐
               ========================================== */
            &.user-message {
                justify-content: flex-end; // 右对齐
                
                .message-container {
                    align-items: flex-end; // 右对齐容器内容
                    
                    .message-time {
                        align-self: flex-end; // 右对齐时间戳
                    }
                }
                
                .message-bubble {
                    // 视觉吸引力的渐变背景
                    background: linear-gradient(135deg, $accent-pink-dark 0%, #d65a5a 50%, $accent-pink-dark 100%);
                    color: $font-light;
                    box-shadow: 0 6px 20px rgba(197, 81, 81, 0.3); // 匹配的粉色阴影
                    position: relative;
                    overflow: hidden; // 裁剪动画元素
                    
                    // 动画背景渐变
                    .message-background {
                        background: linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.1));
                        animation: backgroundSlide 3s ease-in-out infinite;
                    }
                    
                    // 消息上的滑动光效
                    &::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                        animation: slideIn 2s ease-in-out infinite;
                        z-index: 1;
                    }
                }
            }
            
            /* ==========================================
               助手消息样式 - 左对齐
               ========================================== */
            &.assistant-message {
                justify-content: flex-start; // 左对齐
                
                .message-bubble {
                    // 助手的浅色渐变背景
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 248, 248, 0.95) 50%, rgba(255, 255, 255, 0.98) 100%);
                    color: $font-gray;
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(224, 166, 166, 0.3); // 微妙边框
                    position: relative;
                    overflow: hidden;
                    
                    // 助手的微妙动画背景
                    .message-background {
                        background: linear-gradient(45deg, rgba(224, 166, 166, 0.05), rgba(253, 203, 110, 0.03), rgba(224, 166, 166, 0.05));
                        animation: backgroundSlide 4s ease-in-out infinite reverse; // 更慢，反向
                    }
                    
                    // 打字指示器状态的特殊样式
                    &.typing {
                        background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 248, 248, 0.9), rgba(255, 255, 255, 0.95));
                        border: 1px solid rgba(224, 166, 166, 0.4);
                        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
                    }
                }
            }
            
            /* ==========================================
               消息气泡 - 核心消息样式
               ========================================== */
            .message-bubble {
                padding: 12px 16px; // 舒适的文字内边距
                border-radius: 10px; // 圆润但不过于圆形
                backdrop-filter: blur(15px); // 玻璃般的效果
                position: relative;
                font-weight: 500;
                font-size: 14px; // 可读的字体大小
                width: fit-content; // 适应内容大小
                max-width: 100%; // 不超出容器
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); // 平滑过渡
                animation: bubblePopIn 0.3s cubic-bezier(0.4, 0, 0.2, 1); // 弹出入场
                animation-fill-mode: both;
                transform: scale(1); // 从完整尺寸开始
                
                // 可选的入场缩放
                &.bubble-entering {
                    transform: scale(0.95);
                }
                
                // 动画效果的背景层
                .message-background {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    border-radius: 10px; // 匹配气泡半径
                    z-index: 0; // 在内容之后
                }
                
                /* ==========================================
                   消息内容 - 文本显示
                   ========================================== */
                .message-content {
                    word-wrap: break-word; // 断行长词
                    word-break: break-word; // 必要时强制断行
                    overflow-wrap: break-word; // 更好的文本换行
                    white-space: pre-wrap; // 保留空格和换行符
                    line-height: 1.5; // 舒适的阅读行高
                    position: relative;
                    z-index: 2; // 在背景效果之上
                    opacity: 1;
                    animation: none; // 默认无动画
                    max-width: 100%; // 防止溢出
                    
                    // 实时打字时的光标效果
                    &.content-typing {
                        &::after {
                            content: '|';
                            animation: cursor-blink 1s ease-in-out infinite;
                            color: $accent-brown;
                            margin-left: 2px;
                        }
                    }
                }
                
                // 悬停交互的闪光效果
                .message-shimmer {
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                    opacity: 0; // 激活前隐藏
                    z-index: 1;
                    border-radius: 10px; // 匹配气泡半径
                }
                
                /* ==========================================
                   打字指示器 - 加载动画
                   ========================================== */
                .typing-indicator {
                    display: flex;
                    gap: 4px;
                    align-items: center;
                    justify-content: center;
                    padding: 8px 0;
                    position: relative;
                    z-index: 2; // 在背景之上
                    
                    // 打字效果的动画点
                    span {
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        background: linear-gradient(45deg, $accent-brown, #a0522d); // 渐变点
                        animation: typingBounce 1.4s ease-in-out infinite;
                        box-shadow: 0 2px 8px rgba(139, 69, 19, 0.4);
                        
                        // 波浪效果的错开动画延迟
                        &:nth-child(1) { animation-delay: 0s; }
                        &:nth-child(2) { animation-delay: 0.2s; }
                        &:nth-child(3) { animation-delay: 0.4s; }
                    }
                }
            }
        }
    }
    
    /* ==========================================
       聊天底部 - 输入区域
       ========================================== */
    .chat-footer {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        height: auto;
        min-height: 50px; // 最小可用高度
        flex-shrink: 0; // 防止底部收缩
    }
}

/* ==========================================
   关键帧动画
   各种效果的可重用动画
   ========================================== */

// 消息入场动画 - 带缩放的向上滑动
@keyframes messageEntrance {
    from {
        opacity: 0;
        transform: translateY(30px) scale(0.8);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

// 头像弹跳入场
@keyframes avatarBounce {
    from {
        transform: translateY(30px) scale(0.8);
    }
    to {
        transform: translateY(0) scale(1);
    }
}

// 时间戳从顶部淡入
@keyframes fadeInDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

// 消息气泡弹出效果
@keyframes bubblePopIn {
    from {
        opacity: 0;
        transform: scale(0.8);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

// 文本内容淡入
@keyframes textFadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

// 悬停时的闪光效果
@keyframes shimmer {
    0% {
        transform: translateX(-100%);
        opacity: 0;
    }
    50% {
        opacity: 0.6;
    }
    100% {
        transform: translateX(100%);
        opacity: 0;
    }
}

// 背景渐变滑动动画
@keyframes backgroundSlide {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

// 消息上的光扫动画
@keyframes slideIn {
    0% {
        left: -100%;
    }
    100% {
        left: 0;
    }
}

// 头像光晕脉动效果
@keyframes pulse {
    0% {
        opacity: 0.3;
        transform: scale(1);
    }
    50% {
        opacity: 0.6;
        transform: scale(1.1);
    }
    100% {
        opacity: 0.3;
        transform: scale(1);
    }
}

// 打字效果的闪烁光标
@keyframes cursor-blink {
    0%, 50% {
        opacity: 1;
    }
    51%, 100% {
        opacity: 0;
    }
}

// 打字指示器弹跳点
@keyframes typingBounce {
    0%, 60%, 100% {
        transform: translateY(0) scale(1);
        opacity: 0.7;
    }
    30% {
        transform: translateY(-10px) scale(1.1);
        opacity: 1;
    }
}

// 传统打字动画（后备方案）
@keyframes typing {
    0%, 60%, 100% {
        transform: translateY(0) scale(1);
        opacity: 0.7;
    }
    30% {
        transform: translateY(-10px) scale(1.1);
        opacity: 1;
    }
}
</style>