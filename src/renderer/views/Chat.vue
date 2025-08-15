<script lang="ts" setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { usePlayer } from '../hooks/usePlayer';
import type { ChatMessage, HistoryChatMessage } from '../types/llm';
import { useAudio } from '../hooks/useAudio';
import petmateAvatar from "../assets/image/petmate-1.jpg";
import userAvatar from "../assets/image/petmate-3.jpg";
// ...other imports

const saveChatImmediately = async () => {
    await window.api.saveChatMessages();
};

// 添加消息到聊天记录
const addMessage = async (role: ChatMessage['role'], content: string) => {
    const newMessage: ChatMessageWithTimestamp = {
        role,
        content,
        timestamp: new Date()
    };
    messages.value.push(newMessage);
    scrollToBottom();
    await saveChatImmediately(); // 新增：每次添加消息后立即保存聊天记录
};

// 发送消息的逻辑里也要加
const handleSend = async () => {
    // ...发送消息逻辑
    await addMessage('user', inputMessage.value);
    // ...发送到后端，获取助手回复
    // 假设助手回复后:
    await addMessage('assistant', assistantReply);
};

onUnmounted(async () => {
    // 清理定时器
    if (streamCheckInterval) {
        clearInterval(streamCheckInterval);
        streamCheckInterval = null;
    }
    clearAudioResources();
    await saveChatImmediately(); // 保持原有卸载时保存
});
</script>