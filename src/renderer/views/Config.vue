<template>
  <div id="config">
    <!-- Notification Toast -->
    <div v-if="notification && notification.show" 
         class="notification-toast" 
         :class="notification.type">
      <div class="notification-content">
        <n-icon size="20">
          <svg v-if="notification.type === 'success'" viewBox="0 0 24 24">
            <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
          </svg>
          <svg v-else-if="notification.type === 'error'" viewBox="0 0 24 24">
            <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
          <svg v-else-if="notification.type === 'warning'" viewBox="0 0 24 24">
            <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" />
          </svg>
          <svg v-else viewBox="0 0 24 24">
            <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        </n-icon>
        <span>{{ notification.message }}</span>
      </div>
    </div>

    <div class="config-container">
      <!-- Header -->
      <div class="config-header">
        <h1>AI Configuration Center</h1>
        <p>Configure your Chat LLM and TTS settings</p>
      </div>

      <!-- Main Selection View -->
      <div v-if="currentView === 'selection'" class="selection-view">
        <div class="selection-grid">
          <div class="selection-card" @click="showChatLLMConfig">
            <div class="card-icon">🤖</div>
            <h3>Chat LLM</h3>
            <p>Configure your AI chat model settings, API keys, and custom prompts</p>
            <div class="card-arrow">→</div>
          </div>
          
          <div class="selection-card" @click="showTTSConfig">
            <div class="card-icon">🔊</div>
            <h3>TTS Settings</h3>
            <p>Set up text-to-speech parameters and voice cloning options</p>
            <div class="card-arrow">→</div>
          </div>
        </div>
      </div>

      <!-- Chat LLM Configuration View -->
      <div v-else-if="currentView === 'chatllm'" class="config-view">
        <div class="view-header">
          <n-button @click="backToSelection" class="back-btn" size="small">
            ← Back
          </n-button>
          <h2>🤖 Chat LLM Configuration</h2>
        </div>

        <div class="config-content">
          <!-- LLM Basic Information -->
          <div class="config-card">
            <div class="card-header">
              <h3>Basic Information</h3>
            </div>
            <div class="config-form">
              <div class="form-group">
                <label>Base URL</label>
                <n-input 
                  v-model:value="chatConfig.baseUrl" 
                  placeholder="https://api.openai.com/v1"
                  class="config-input"
                />
              </div>
              <div class="form-group">
                <label>API Key</label>
                <n-input 
                  v-model:value="chatConfig.apiKey" 
                  type="password"
                  placeholder="Enter your API key"
                  class="config-input"
                  show-password-on="click"
                />
              </div>
              <div class="form-group">
                <label>Model</label>
                <n-select
                  v-model:value="chatConfig.model"
                  :options="modelOptions"
                  placeholder="Select a model"
                  class="config-input"
                />
              </div>
              <div class="form-actions">
                <n-button 
                  type="primary" 
                  class="save-btn"
                  @click="saveLLMConfig"
                  :loading="savingLLM"
                >
                  💾 Save
                </n-button>
              </div>
            </div>
          </div>

          <!-- Prompt Customization -->
          <div class="config-card">
            <div class="card-header">
              <h3>Prompt Customization</h3>
            </div>
            <div class="config-form">
              <div class="form-group">
                <label>Custom System Prompt</label>
                <n-input
                  v-model:value="customPrompt"
                  type="textarea"
                  :rows="6"
                  placeholder="Enter your custom prompt here to define the AI's personality and behavior..."
                  class="config-input"
                />
              </div>
              <div class="form-actions">
                <n-button 
                  type="info" 
                  class="save-btn"
                  @click="setChatStyle"
                  :loading="settingStyle"
                >
                  🎨 Set Chat Style
                </n-button>
              </div>
            </div>
          </div>

          <!-- Scroll Hint for Chat LLM - Show when Prompt section is below viewport -->
          <div v-if="showChatLLMScrollHint" class="scroll-hint bottom-hint">
            <div class="scroll-hint-content">
              <div class="scroll-icon">
                <div class="scroll-chevron"></div>
                <div class="scroll-chevron"></div>
                <div class="scroll-chevron"></div>
              </div>
              <p class="scroll-text">下滑可制定聊天风格和内容</p>
            </div>
          </div>
        </div>
      </div>

      <!-- TTS Configuration View -->
      <div v-else-if="currentView === 'tts'" class="config-view">
        <div class="view-header">
          <n-button @click="backToSelection" class="back-btn" size="small">
            ← Back
          </n-button>
          <h2>🔊 TTS Configuration</h2>
        </div>

        <div class="config-content">
          <!-- TTS Basic Information -->
          <div class="config-card">
            <div class="card-header">
              <h3>Basic Settings</h3>
            </div>
            <div class="config-form">
              <div class="form-row">
                <div class="form-group half-width">
                  <label>Rate (语速)</label>
                  <n-slider 
                    v-model:value="ttsConfig.parameters.rate"
                    :min="0.5"
                    :max="2.0"
                    :step="0.1"
                    class="config-slider"
                  />
                  <span class="slider-value">{{ ttsConfig.parameters.rate }}x</span>
                </div>
                <div class="form-group half-width">
                  <label>Pitch (音调)</label>
                  <n-slider 
                    v-model:value="ttsConfig.parameters.pitch"
                    :min="0.5"
                    :max="2.0"
                    :step="0.1"
                    class="config-slider"
                  />
                  <span class="slider-value">{{ ttsConfig.parameters.pitch }}x</span>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group half-width">
                  <label>Sample Rate</label>
                  <n-select
                    v-model:value="ttsConfig.parameters.sample_rate"
                    :options="sampleRateOptions"
                    class="config-input"
                  />
                </div>
                <div class="form-group half-width">
                  <label>Volume</label>
                  <n-slider 
                    v-model:value="ttsConfig.parameters.volume"
                    :min="0"
                    :max="100"
                    :step="1"
                    class="config-slider"
                  />
                  <span class="slider-value">{{ ttsConfig.parameters.volume }}%</span>
                </div>
              </div>
              <div class="form-group">
                <label>Voice ID</label>
                <n-select
                  v-model:value="ttsConfig.parameters.voice"
                  :options="voiceOptions"
                  placeholder="Select a voice ID"
                  class="config-input"
                />
              </div>
              <div class="form-actions">
                <n-button 
                  type="primary" 
                  class="save-btn"
                  @click="saveTTSConfig"
                  :loading="savingTTS"
                >
                  💾 Save Settings
                </n-button>
              </div>
            </div>
          </div>

          <!-- Voice Cloning -->
          <div class="config-card">
            <div class="card-header">
              <h3>Voice Cloning</h3>
            </div>
            <div class="config-form">
              <div class="form-group">
                <label>Upload Voice Sample</label>
                <n-upload
                  :default-file-list="fileList"
                  :max="1"
                  accept=".wav,.mp3"
                  @change="handleFileChange"
                  class="voice-upload"
                >
                  <n-upload-dragger>
                    <div style="margin-bottom: 12px">
                      <n-icon size="48" :depth="3">
                        <svg viewBox="0 0 24 24">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      </n-icon>
                    </div>
                    <n-text style="font-size: 16px">
                      Click or drag a voice file to this area to upload
                    </n-text>
                    <n-p depth="3" style="margin: 8px 0 0 0">
                      Supports .wav and .mp3 formats. The AI will learn from this voice sample.
                    </n-p>
                  </n-upload-dragger>
                </n-upload>
              </div>
              
              <div v-if="cloneStatus" class="clone-status">
                <div class="status-indicator" :class="cloneStatus.type">
                  <n-icon size="20">
                    <svg v-if="cloneStatus.type === 'processing'" viewBox="0 0 24 24">
                      <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
                    </svg>
                    <svg v-else-if="cloneStatus.type === 'success'" viewBox="0 0 24 24">
                      <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24">
                      <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                    </svg>
                  </n-icon>
                  <span>{{ cloneStatus.message }}</span>
                </div>
              </div>

              <!-- Cloned Voice ID Display -->
              <div v-if="clonedVoiceId" class="cloned-voice-info">
                <div class="voice-id-card">
                  <h4>🎭 Your Cloned Voice</h4>
                  <div class="voice-id-display">
                    <label>Voice ID:</label>
                    <code class="voice-id">{{ clonedVoiceId }}</code>
                    <n-button size="small" @click="copyVoiceId" class="copy-btn">
                      📋 Copy
                    </n-button>
                  </div>
                  <p class="voice-usage-hint">Use this Voice ID in the TTS settings above</p>
                </div>
              </div>

              <div class="form-actions">
                <n-button 
                  type="success" 
                  class="save-btn"
                  @click="processVoiceClone"
                  :loading="processingVoice"
                  :disabled="!uploadedFile"
                >
                  🎭 Clone Voice
                </n-button>
              </div>
            </div>
          </div>

          <!-- Scroll Hint for TTS - Show when Voice Cloning section is below viewport -->
          <div v-if="showTTSScrollHint" class="scroll-hint bottom-hint">
            <div class="scroll-hint-content">
              <div class="scroll-icon">
                <div class="scroll-chevron"></div>
                <div class="scroll-chevron"></div>
                <div class="scroll-chevron"></div>
              </div>
              <p class="scroll-text">下滑可制定音色</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick, onUnmounted } from 'vue'
import type { ChatLLMConfig, TTSLLMConfig } from '../types/llm'

// 聊天LLM配置
const chatConfig = reactive<ChatLLMConfig>({
  model: '',
  apiKey: '',
  baseUrl: ''
})

const customPrompt = ref('')
const savingLLM = ref(false)
const settingStyle = ref(false)

// tts配置
const ttsConfig = reactive<TTSLLMConfig>({
  model: '',
  apiKey: '',
  baseUrl: '',
  parameters: {
    voice: '',
    format: 'mp3',
    sample_rate: 22050,
    volume: 80,
    rate: 1.0,
    pitch: 1.0
  }
})

const savingTTS = ref(false)
const processingVoice = ref(false)
const uploadedFile = ref<File | null>(null)
const fileList = ref([])
const clonedVoiceId = ref<string | null>(null)

// 当前页面，默认是选择页面
const currentView = ref<'selection' | 'chatllm' | 'tts'>('selection')

// 提示滚动
const showChatLLMScrollHint = ref(false)
const showTTSScrollHint = ref(false)

// 通知系统，用于告知 操作成功 or 失败
const notification = ref<{
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  show: boolean
} | null>(null)

// 语音克隆状态
const cloneStatus = ref<{
  type: 'processing' | 'success' | 'error'
  message: string
} | null>(null)

// 显示通知
const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
  notification.value = { type, message, show: true }
  // Auto hide after 3 seconds
  setTimeout(() => {
    if (notification.value) {
      notification.value.show = false
      setTimeout(() => {
        notification.value = null
      }, 300)
    }
  }, 3000)
}

// 可选择的模型，目前只有两个
const modelOptions = [
  { label: 'deepseek-v3', value: 'deepseek-v3' },
  { label: 'qwen2.5-72b', value: 'qwen2.5-72b' }
]

// 可选择的语音
const voiceOptions = [
  { label: 'voice_001 (Alloy-like)', value: 'voice_001' },
  { label: 'voice_002 (Echo-like)', value: 'voice_002' },
  { label: 'voice_003 (Fable-like)', value: 'voice_003' },
  { label: 'voice_004 (Onyx-like)', value: 'voice_004' },
  { label: 'voice_005 (Nova-like)', value: 'voice_005' },
  { label: 'voice_006 (Shimmer-like)', value: 'voice_006' }
]

// tts采样率选项
const sampleRateOptions = [
  { label: '16kHz', value: 16000 },
  { label: '22kHz', value: 22050 },
  { label: '44kHz', value: 44100 },
  { label: '48kHz', value: 48000 }
]

// Methods
// 保存llm配置
const saveLLMConfig = async () => {
  savingLLM.value = true
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    showNotification('success', '模型配置保存成功')
  } catch (error) {
    showNotification('error', '模型配置保存失败')
  } finally {
    savingLLM.value = false
  }
}

// 设置聊天风格
const setChatStyle = async () => {
  settingStyle.value = true
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))
    showNotification('success', '成功设置好了聊天风格')
  } catch (error) {
    showNotification('error', '聊天风格设置失败')
  } finally {
    settingStyle.value = false
  }
}

// 保存tts的配置
const saveTTSConfig = async () => {
  savingTTS.value = true
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    showNotification('success', 'tts配置保存成功')
  } catch (error) {
    showNotification('error', 'tts配置保存失败')
  } finally {
    savingTTS.value = false
  }
}

// 处理文件上传
const handleFileChange = (data: any) => {
  if (data.fileList.length > 0) {
    uploadedFile.value = data.fileList[0].file
    cloneStatus.value = null
  } else {
    uploadedFile.value = null
  }
}

// 处理语音克隆
const processVoiceClone = async () => {
  if (!uploadedFile.value) {
    showNotification('warning', '请先上传一个.mp3或者是.wav的语音文件')
    return
  }

  processingVoice.value = true
  cloneStatus.value = {
    type: 'processing',
    message: '正在克隆语音... 这可能需要几分钟，这个过程请全程保持联网'
  }

  try {
    // Simulate voice cloning process
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Generate a new voice ID
    const newVoiceId = `voice_custom_${Date.now().toString().slice(-6)}`
    clonedVoiceId.value = newVoiceId
    
    cloneStatus.value = {
      type: 'success',
      message: '语音克隆完成! 你的自定义语音已经准备好使用了'
    }
    showNotification('success', `语音克隆完成! ID: ${newVoiceId}`)
  } catch (error) {
    cloneStatus.value = {
      type: 'error',
      message: '语音克隆失败. 请确保音频文件是.mp3/.wav格式，并尝试使用不同的音频文件'
    }
    showNotification('error', '语音克隆失败')
  } finally {
    processingVoice.value = false
  }
}

// 将语音ID复制到剪切板
const copyVoiceId = async () => {
  if (clonedVoiceId.value) {
    try {
      await navigator.clipboard.writeText(clonedVoiceId.value)
      showNotification('success', '语音ID已复制到剪贴板!')
    } catch (error) {
      showNotification('error', '语音ID复制到剪切板失败')
    }
  }
}

// 显示聊天LLM配置
const showChatLLMConfig = () => {
  currentView.value = 'chatllm'
  // 提示滚动
  nextTick(() => {
    setTimeout(checkScrollHints, 200)
  })
}

// 显示tts配置
const showTTSConfig = () => {
  currentView.value = 'tts'
  // 提示滚动
  nextTick(() => {
    setTimeout(checkScrollHints, 200)
  })
}

// 返回主界面
const backToSelection = () => {
  currentView.value = 'selection'
  // 隐藏提示滚动
  showChatLLMScrollHint.value = false
  showTTSScrollHint.value = false
}

// 提示滚动
const checkScrollHints = () => {
  const container = document.getElementById('config')
  if (!container) return

  const windowHeight = window.innerHeight
  const scrollTop = container.scrollTop
  const scrollHeight = container.scrollHeight

  // 检查是否还有更多内容
  const hasMoreContent = scrollTop + windowHeight < scrollHeight - 50

  if (currentView.value === 'chatllm') {
    // 显示提示
    showChatLLMScrollHint.value = hasMoreContent && scrollTop < 200
  } else if (currentView.value === 'tts') {
    // 显示提示
    showTTSScrollHint.value = hasMoreContent && scrollTop < 200
  } else {
    showChatLLMScrollHint.value = false
    showTTSScrollHint.value = false
  }
}

// 页面变换的时候更新提示滚动
watch(currentView, () => {
  nextTick(() => {
    setTimeout(checkScrollHints, 100)
  })
})

onMounted(() => {
  // 初始化
  chatConfig.baseUrl = 'https://api.openai.com/v1'
  chatConfig.apiKey = 'sk-demo-key-***************************'
  chatConfig.model = 'gpt-4'
  
  customPrompt.value = 'You are a helpful AI assistant for a pet care application. Be friendly, creative, and engaging in your responses. Help users take better care of their virtual pets.'
  
  // tts初始化
  ttsConfig.model = 'tts-1'
  ttsConfig.apiKey = 'sk-demo-tts-key-***********************'
  ttsConfig.baseUrl = 'https://api.openai.com/v1'
  ttsConfig.parameters.voice = 'voice_001'
  ttsConfig.parameters.rate = 1.2
  ttsConfig.parameters.pitch = 1.1
  ttsConfig.parameters.volume = 85
  ttsConfig.parameters.sample_rate = 22050
  
  // 显示一个示例克隆语音ID
  // clonedVoiceId.value = 'voice_custom_123456'

  // 添加滚动事件监听器
  const container = document.getElementById('config')
  if (container) {
    container.addEventListener('scroll', checkScrollHints)
    window.addEventListener('resize', checkScrollHints)
  }
})

onUnmounted(() => {
  // 清理事件监听器
  const container = document.getElementById('config')
  if (container) {
    container.removeEventListener('scroll', checkScrollHints)
    window.removeEventListener('resize', checkScrollHints)
  }
})
</script>

<style lang="scss" scoped>
#config {
  width: 100%;
  height: 100%;
  background-image: url('../assets/image/systemBg.jpg');
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  overflow-y: auto;
}

.config-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 15px;
  min-height: 100vh;
}

.config-header {
  text-align: center;
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, $btn-grad-start 0%, $btn-grad-end 100%);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  
  h1 {
    font-size: 1.8em;
    color: $font-gray;
    margin-bottom: 5px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  p {
    font-size: 0.9em;
    color: $font-gray;
    opacity: 0.8;
    margin: 0;
  }
}

// Selection View Styles
.selection-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.selection-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  max-width: 700px;
  width: 100%;
  
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.selection-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  border-radius: 16px;
  padding: 30px 25px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
    border-color: $border-orange-300;
    
    .card-arrow {
      transform: translateX(5px);
      opacity: 1;
    }
    
    .card-icon {
      transform: scale(1.1);
    }
  }
  
  &:active {
    transform: translateY(-4px) scale(1.01);
  }
}

.card-icon {
  font-size: 3.5em;
  margin-bottom: 15px;
  transition: transform 0.3s ease;
  display: block;
}

.selection-card h3 {
  font-size: 1.4em;
  color: $font-gray;
  margin: 0 0 10px 0;
  font-weight: 600;
}

.selection-card p {
  color: $font-gray;
  opacity: 0.8;
  font-size: 0.9em;
  line-height: 1.4;
  margin: 0 0 15px 0;
}

.card-arrow {
  position: absolute;
  bottom: 20px;
  right: 25px;
  font-size: 1.5em;
  color: $accent-pink-dark;
  transition: all 0.3s ease;
  opacity: 0.6;
}

// Configuration View Styles
.config-view {
  max-width: 800px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
  padding: 15px 20px;
  background: linear-gradient(135deg, $item-bg-start 0%, $item-bg-end 100%);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  
  h2 {
    font-size: 1.4em;
    color: $font-gray;
    margin: 0;
    flex: 1;
  }
}

.back-btn {
  border-radius: 8px;
  font-weight: 600;
}

.config-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// Scroll Hint Styles
.scroll-hint {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px 0;
  position: relative;
  
  &.bottom-hint {
    position: fixed;
    bottom: 15px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    margin: 0;
    pointer-events: none;
    
    @media (max-height: 600px) {
      bottom: 10px;
    }
  }
}

.scroll-hint-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(5px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.scroll-icon {
  margin-bottom: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.scroll-chevron {
  width: 12px;
  height: 2px;
  background: $font-gray;
  border-radius: 1px;
  opacity: 0.6;
  transform: rotate(45deg);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    right: 0;
    width: 12px;
    height: 2px;
    background: $font-gray;
    border-radius: 1px;
    transform: rotate(-90deg);
    transform-origin: right;
  }
  
  &:nth-child(1) {
    animation: subtleChevronBounce 3s ease-in-out infinite;
    animation-delay: 0s;
  }
  
  &:nth-child(2) {
    animation: subtleChevronBounce 3s ease-in-out infinite;
    animation-delay: 0.3s;
  }
  
  &:nth-child(3) {
    animation: subtleChevronBounce 3s ease-in-out infinite;
    animation-delay: 0.6s;
  }
}

.scroll-text {
  color: $font-gray;
  font-size: 12px;
  font-weight: 500;
  margin: 0;
  text-align: center;
  opacity: 0.8;
}

// Scroll Hint Animations
@keyframes subtleChevronBounce {
  0%, 100% {
    transform: rotate(45deg) translateY(0);
    opacity: 0.6;
  }
  50% {
    transform: rotate(45deg) translateY(3px);
    opacity: 0.8;
  }
}

.config-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  }
}

.card-header {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid $bg-white-200;
  
  h3 {
    font-size: 1.1em;
    color: $font-gray;
    margin: 0;
  }
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  
  &.half-width {
    min-width: 0;
  }
  
  label {
    font-size: 13px;
    font-weight: 600;
    color: $font-gray;
    margin-bottom: 3px;
  }
}

.config-input {
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:focus-within {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.config-slider {
  margin: 8px 0;
}

.slider-value {
  font-size: 11px;
  color: $font-gray;
  font-weight: 600;
  background: $bg-white-200;
  padding: 2px 6px;
  border-radius: 8px;
  display: inline-block;
  margin-top: 3px;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

.save-btn {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 18px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.voice-upload {
  .n-upload-dragger {
    border: 2px dashed $border-orange-300;
    border-radius: 8px;
    background: linear-gradient(135deg, $item-bg-start 0%, $item-bg-end 100%);
    transition: all 0.2s ease;
    padding: 20px 15px;
    
    &:hover {
      border-color: $accent-pink-dark;
      background: linear-gradient(135deg, $btn-grad-start 0%, $btn-grad-end 100%);
      transform: translateY(-1px);
    }
  }
}

.clone-status {
  margin: 12px 0;
}

.cloned-voice-info {
  margin: 15px 0;
}

.voice-id-card {
  background: linear-gradient(135deg, $item-bg-start 0%, $item-bg-end 100%);
  border: 2px solid $border-orange-300;
  border-radius: 8px;
  padding: 15px;
  
  h4 {
    margin: 0 0 10px 0;
    color: $font-gray;
    font-size: 1em;
  }
}

.voice-id-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  
  label {
    font-weight: 600;
    color: $font-gray;
    min-width: 60px;
    font-size: 12px;
  }
  
  .voice-id {
    background: $bg-white-200;
    color: $accent-pink-dark;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    font-size: 12px;
    border: 1px solid $border-orange-300;
    flex: 1;
  }
  
  .copy-btn {
    padding: 4px 8px;
    font-size: 11px;
  }
}

.voice-usage-hint {
  font-size: 11px;
  color: $font-gray;
  opacity: 0.7;
  margin: 0;
  font-style: italic;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  
  &.processing {
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    color: #1976d2;
    border: 1px solid #64b5f6;
    
    svg {
      animation: spin 1s linear infinite;
    }
  }
  
  &.success {
    background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
    color: #388e3c;
    border: 1px solid #81c784;
  }
  
  &.error {
    background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
    color: #d32f2f;
    border: 1px solid #e57373;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// Notification Toast
.notification-toast {
  position: fixed;
  top: 15px;
  right: 15px;
  z-index: 10000;
  padding: 12px 18px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
  animation: slideInRight 0.25s ease-out;
  min-width: 250px;
  max-width: 320px;
  
  &.success {
    background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
    color: #388e3c;
    border: 1px solid #81c784;
  }
  
  &.error {
    background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
    color: #d32f2f;
    border: 1px solid #e57373;
  }
  
  &.warning {
    background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
    color: #f57c00;
    border: 1px solid #ffb74d;
  }
  
  &.info {
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    color: #1976d2;
    border: 1px solid #64b5f6;
  }
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  font-size: 13px;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

// Responsive design for smaller Electron windows
@media (max-width: 900px) {
  .config-container {
    padding: 10px;
  }
  
  .config-header {
    padding: 10px;
    margin-bottom: 15px;
    
    h1 {
      font-size: 1.5em;
    }
  }
  
  .selection-grid {
    gap: 20px;
    max-width: 500px;
  }
  
  .selection-card {
    padding: 25px 20px;
    
    .card-icon {
      font-size: 3em;
    }
    
    h3 {
      font-size: 1.2em;
    }
    
    p {
      font-size: 0.85em;
    }
  }
  
  .config-view {
    max-width: none;
  }
  
  .view-header {
    padding: 12px 15px;
    margin-bottom: 20px;
    
    h2 {
      font-size: 1.2em;
    }
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .config-card {
    padding: 15px;
  }
  
  .scroll-hint-content {
    padding: 6px 12px;
    
    .scroll-text {
      font-size: 11px;
    }
    
    .scroll-chevron {
      width: 10px;
      height: 2px;
      
      &::before {
        width: 10px;
        height: 2px;
      }
    }
  }
  
  .notification-toast {
    right: 10px;
    left: 10px;
    min-width: unset;
    padding: 12px 16px;
  }
}

@media (max-width: 600px) {
  .config-container {
    padding: 8px;
  }
  
  .selection-card {
    padding: 20px 15px;
    
    .card-icon {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    
    h3 {
      font-size: 1.1em;
    }
    
    p {
      font-size: 0.8em;
    }
  }
  
  .view-header {
    padding: 10px 12px;
    
    h2 {
      font-size: 1.1em;
    }
  }
  
  .scroll-hint-content {
    padding: 5px 10px;
    
    .scroll-text {
      font-size: 10px;
    }
    
    .scroll-chevron {
      width: 8px;
      height: 1px;
      
      &::before {
        width: 8px;
        height: 1px;
      }
    }
  }
}
</style>