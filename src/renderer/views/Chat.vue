<template>
    <div class="chat-container">
        <div class="chat-header">
            <span style="font-family: Petmate; font-size: 30px">Dass Chat</span>
        </div>
        
        <!-- 聊天消息显示区域 -->
        <div class="chat-content" ref="chatContentRef">
            <div 
                v-for="(message, index) in messages" 
                :key="index" 
                class="message-wrapper"
                :class="message.role === 'user' ? 'user-message' : 'assistant-message'"
            >
                <div class="message-bubble">
                    <div class="message-content">{{ message.content }}</div>
                    <div class="message-time">{{ formatTime(message.timestamp) }}</div>
                </div>
            </div>
            <!-- 加载指示器 -->
            <div v-if="loading && !isTyping && messages.length > 0" class="message-wrapper assistant-message">
                <div class="message-bubble typing">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
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

// 扩展的消息接口，包含时间戳
interface ChatMessageWithTimestamp extends ChatMessage {
    timestamp: Date;
}

const { chat } = usePlayer();

// 响应式数据
const messages = ref<ChatMessageWithTimestamp[]>([]);
const inputMessage = ref('');
const buttonStatus = ref('↑');
const loading = ref(false);
const isTyping = ref(false); // 是否正在打字输出
const chatContentRef = ref<HTMLElement | null>(null);

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
    messages.value.push({
        role,
        content,
        timestamp: new Date()
    });
    scrollToBottom();
};

// 添加带有流式打字效果的消息
const addTypingMessage = async (content: string) => {
    // 开始打字时，隐藏加载指示器
    isTyping.value = true;
    
    let accumulatedText = '';
    let messageIndex = -1;
    
    // 逐词添加内容，创建流式效果
    for (let i = 0; i < content.length; i++) {
        // 构建当前显示的文本
        accumulatedText = content.substring(0, i + 1);
        
        // 如果是第一个词，创建新消息
        if (i === 0) {
            const newMessage: ChatMessageWithTimestamp = {
                role: 'assistant',
                content: accumulatedText,
                timestamp: new Date()
            };
            messages.value.push(newMessage);
            messageIndex = messages.value.length - 1;
        } else {
            // 更新现有消息内容 - 使用 Vue 的响应式更新
            if (messageIndex >= 0) {
                messages.value[messageIndex] = {
                    ...messages.value[messageIndex],
                    content: accumulatedText
                };
            }
        }
        
        // 滚动到底部
        await scrollToBottom();
        
        // 如果不是最后一个词，等待一段时间再显示下一个词
        if (i < content.length - 1) {
            // 根据词的长度和内容调整延迟
            let delay = 50; // 基础延迟
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // 打字完成后，结束加载和打字状态
    isTyping.value = false;
    loading.value = false;
    buttonStatus.value = '↑';
};

// 模拟接收 Dass 的回复
const simulateDassResponse = async () => {
    // 这里模拟一个延时，实际项目中会通过 IPC 接收实际的 AI 回复
    const responses = [
        "你好！我是 Dass，很高兴和你聊天！",
        "今天心情怎么样呢？",
        "有什么想要聊的话题吗？",
        "我在这里陪着你呢～",
        "让我们一起度过愉快的时光吧！",
        "我们可以聊聊你的兴趣爱好，或者我可以为你唱首歌～",
        "作为你的Petmate，我会一直陪伴在你身边的！",
        "今天学习累了吗？来和我聊聊轻松一下吧！",
        "你知道吗？和你聊天是我最开心的时候呢！"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    console.log(randomResponse)
    await addTypingMessage(randomResponse);
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

        // 创建聊天消息对象
        const chatMessage: ChatMessage = {
            role: 'user',
            content: message
        };

        // 发送消息到主进程
        const success = true;
        
        if (success) {
            // 如果发送成功，模拟接收回复（实际项目中会通过事件监听接收）
            await simulateDassResponse();
            // 打字效果完成后，loading状态会在addTypingMessage函数中处理
        } else {
            // 发送失败的处理
            addMessage('assistant', '抱歉，我现在无法回复，请稍后再试。');
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        addMessage('assistant', '出现了一些问题，请稍后再试。');
    } finally {
        // 确保在任何情况下都重置状态
        isTyping.value = false;
        loading.value = false;
        buttonStatus.value = '↑';
    }
};

// 处理回车键
const handleEnter = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
};




</script>

<style scoped lang="scss">
.chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: $system-bgc;
    padding: 10px;
    box-sizing: border-box;
    
    .chat-header {
        height: 60px;
        background-color: $content-bgc;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        margin-bottom: 10px;
        flex-shrink: 0;
        color: $font-light;
        box-shadow: 0 4px 24px 0 rgba(253, 203, 110, 0.15);
    }
    
    .chat-content {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        background-color: $content-bgc;
        border-radius: 10px;
        margin-bottom: 10px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        box-shadow: 0 4px 24px 0 rgba(253, 203, 110, 0.15);
        
        // 自定义滚动条
        &::-webkit-scrollbar {
            width: 6px;
        }
        
        &::-webkit-scrollbar-track {
            background: rgba(139, 69, 19, 0.1);
            border-radius: 3px;
        }
        
        &::-webkit-scrollbar-thumb {
            background: rgba(224, 166, 166, 0.4);
            border-radius: 3px;
            
            &:hover {
                background: rgba(224, 166, 166, 0.6);
            }
        }
        
        .welcome-message {
            text-align: center;
            color: $font-muted-light;
            margin-top: 20px;
            font-size: 16px;
        }
        
        .message-wrapper {
            display: flex;
            width: 100%;
            margin-bottom: 8px;
            
            &.user-message {
                justify-content: flex-end;
                
                .message-bubble {
                    background: $accent-pink-dark;
                    color: $font-light;
                    margin-left: 20%;
                    box-shadow: 0 6px 20px rgba(197, 81, 81, 0.25);
                    position: relative;
                    
                    &::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 15px;
                        pointer-events: none;
                    }
                }
            }
            
            &.assistant-message {
                justify-content: flex-start;
                
                .message-bubble {
                    background: rgba(255, 255, 255, 0.95);
                    color: $font-gray;
                    margin-right: 20%;
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(224, 166, 166, 0.2);
                    
                    &.typing {
                        background: rgba(255, 255, 255, 0.9);
                        border: 1px solid rgba(224, 166, 166, 0.3);
                    }
                }
            }
            
            .message-bubble {
                max-width: 75%;
                padding: 14px 18px;
                border-radius: 15px;
                animation: messageSlideIn 0.3s ease-out;
                backdrop-filter: blur(10px);
                position: relative;
                font-weight: 500;
                
                .message-content {
                    word-wrap: break-word;
                    line-height: 1.5;
                    margin-bottom: 6px;
                    position: relative;
                    z-index: 1;
                }
                
                .message-time {
                    font-size: 11px;
                    opacity: 0.6;
                    text-align: right;
                    font-weight: 400;
                    position: relative;
                    z-index: 1;
                }
                
                .typing-indicator {
                    display: flex;
                    gap: 4px;
                    align-items: center;
                    justify-content: center;
                    padding: 8px 0;
                    
                    span {
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        background-color: $accent-brown;
                        animation: typing 1.4s infinite ease-in-out;
                        box-shadow: 0 2px 4px rgba(139, 69, 19, 0.3);
                        
                        &:nth-child(1) { animation-delay: 0s; }
                        &:nth-child(2) { animation-delay: 0.2s; }
                        &:nth-child(3) { animation-delay: 0.4s; }
                    }
                }
            }
        }
    }
    
    .chat-footer {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        height: auto;
        min-height: 50px;
        flex-shrink: 0;
    }
}

@keyframes messageSlideIn {
    from {
        opacity: 0;
        transform: translateY(15px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes typing {
    0%, 60%, 100% {
        transform: translateY(0) scale(1);
        opacity: 0.7;
    }
    30% {
        transform: translateY(-12px) scale(1.1);
        opacity: 1;
    }
}
</style>