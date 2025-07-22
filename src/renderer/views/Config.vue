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
        <h1>AI配置</h1>
        <p>配置你的聊天LLM和语音合成设置</p>
      </div>

      <!-- Main Selection View -->
      <div v-if="currentView === 'selection'" class="selection-view">
        <div class="selection-grid">
          <div class="selection-card" @click="showChatLLMConfig">
            <h3>聊天LLM</h3>
            <p>配置你的AI聊天模型设置、API密钥和自定义提示词</p>
            <div class="card-arrow">→</div>
          </div>
          
          <div class="selection-card" @click="showTTSConfig">
            <h3>语音合成</h3>
            <p>设置文本转语音参数和音色克隆选项</p>
            <div class="card-arrow">→</div>
          </div>
        </div>
      </div>

      <!-- Chat LLM Configuration View -->
      <div v-else-if="currentView === 'chatllm'" class="config-view">
        <div class="view-header">
          <n-button @click="backToSelection" class="back-btn" size="small">
            ← 返回
          </n-button>
          <h2>聊天LLM配置</h2>
        </div>

        <div class="config-content">
          <!-- LLM Basic Information -->
          <div class="config-card">
            <div class="card-header">
              <h3>基础信息</h3>
            </div>
            <div class="config-form">
              <div class="form-group">
                <label>接口地址</label>
                <n-input 
                  v-model:value="chatConfig.baseUrl" 
                  placeholder="https://api.openai.com/v1"
                  class="config-input"
                />
              </div>
              <div class="form-group">
                <label>API密钥</label>
                <n-input 
                  v-model:value="chatConfig.apiKey" 
                  type="password"
                  placeholder="输入你的API密钥"
                  class="config-input"
                  show-password-on="click"
                />
              </div>
              <div class="form-group">
                <label>模型</label>
                <n-select
                  v-model:value="chatConfig.model"
                  :options="modelOptions"
                  placeholder="选择一个模型"
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
                  💾 保存
                </n-button>
              </div>
            </div>
          </div>

          <!-- Prompt Customization -->
          <div class="config-card">
            <div class="card-header">
              <h3>提示词定制</h3>
            </div>
            <div class="config-form">
              <div class="form-group">
                <label>自定义系统提示词</label>
                <n-input
                  v-model:value="customPrompt"
                  type="textarea"
                  :rows="6"
                  placeholder="在这里输入你的自定义提示词来定义AI的个性和行为..."
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
                  🎨 设置聊天风格
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
            ← 返回
          </n-button>
          <h2>语音合成配置</h2>
        </div>

        <div class="config-content">
          <!-- TTS Basic Information -->
          <div class="config-card">
            <div class="card-header">
              <h3>基础设置</h3>
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
                  <label>采样率</label>
                  <n-select
                    v-model:value="ttsConfig.parameters.sample_rate"
                    :options="sampleRateOptions"
                    class="config-input"
                  />
                </div>
                <div class="form-group half-width">
                  <label>音量</label>
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
                <label>语音ID</label>
                <n-select
                  v-model:value="ttsConfig.parameters.voice"
                  :options="voiceOptions"
                  placeholder="选择一个语音ID"
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
                  💾 保存设置
                </n-button>
              </div>
            </div>
          </div>

          <!-- Voice Cloning -->
          <div class="config-card">
            <div class="card-header">
              <h3>音色克隆</h3>
            </div>
            <div class="config-form">
              <!-- Voice URL Input Section -->
              <div class="form-group">
                <label>语音文件URL</label>
                <n-input
                  v-model:value="voiceUrl"
                  placeholder="请输入语音文件的URL链接（支持 .wav 和 .mp3 格式）"
                  class="config-input"
                  clearable
                />
                <div class="url-hint">
                  <span>💡提示：请确保URL链接可以直接访问音频文件</span>
                </div>
              </div>

              <!-- Custom Voice Name Input -->
              <div v-if="voiceUrl.trim()" class="form-group voice-naming">
                <label>为这个音色起个名字吧，请尽量别和已有的音色重名，否则会覆盖原来的音色</label>
                <div class="voice-name-container">
                  <div class="voice-name-input-group">
                    <n-input
                      v-model:value="customVoiceName"
                      placeholder="例如: 大小姐"
                      class="voice-name-input"
                      :status="voiceNameError ? 'error' : undefined"
                      @input="validateVoiceName"
                      maxlength="20"
                    />
                    <!-- 可以删除 -->
                    <div class="voice-id-preview">
                      <span class="preview-label">预览ID:</span>
                      <code class="preview-id">{{ generateVoiceIdPreview() }}</code>
                    </div>
                  </div>
                  <div v-if="voiceNameError" class="voice-name-error">
                    {{ voiceNameError }}
                  </div>
                  <div class="voice-name-hint">
                    <span>提示：只能使用字母、数字和中文，不能有空格或特殊符号</span>
                  </div>
                </div>
              </div>

              <!-- Test Text Input Section -->
              <div v-if="voiceUrl.trim() && customVoiceName.trim() && !voiceNameError" class="form-group">
                <label>测试语音内容</label>
                <n-input
                  v-model:value="testText"
                  type="textarea"
                  placeholder="输入想要用这个音色说的话...（例如：你好，主人，欢迎试听我的音色呢）"
                  :autosize="{ minRows: 2, maxRows: 4 }"
                  class="config-input"
                  maxlength="200"
                  show-count
                />
                <div class="url-hint">
                  <span>💡提示：输入测试文本，克隆完成后会自动生成音频供试听</span>
                </div>
              </div>
              
              <!-- Clone and Test Voice Action -->
              <div class="form-actions">
                <n-button 
                  type="success" 
                  class="clone-btn"
                  @click="cloneAndTestVoice"
                  :loading="processingVoice"
                  :disabled="!voiceUrl.trim() || !customVoiceName.trim() || !!voiceNameError || !testText.trim()"
                >
                  🎤 {{ processingVoice ? '正在处理...' : `克隆并试听"${customVoiceName.trim()}"` }}
                </n-button>
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

              <!-- Audio Player Section - Show when voice is cloned -->
              <div v-if="clonedVoiceId" class="audio-player-section">
                <h5>试听音色</h5>
                
                <!-- Edit test text -->
                <div class="form-group" style="margin-bottom: 15px;">
                  <label>修改测试文本</label>
                  <n-input
                    v-model:value="testText"
                    type="textarea"
                    placeholder="输入想要用这个音色说的话..."
                    :autosize="{ minRows: 2, maxRows: 4 }"
                    class="config-input"
                    maxlength="200"
                    show-count
                  />
                </div>
                
                <div class="audio-player-container">
                  <audio 
                    ref="voiceAudioPlayer" 
                    controls 
                    class="voice-audio-player"
                    @ended="onAudioEnded"
                  >
                    您的浏览器不支持音频播放
                  </audio>
                  <p v-if="!audioReady" class="audio-hint">点击"生成测试音频"按钮来生成音频</p>
                  <p v-else class="audio-hint">音频已准备就绪，点击播放按钮试听</p>
                </div>
                
                <!-- Replay and Save Actions -->
                <div class="voice-actions-section">
                  <div class="voice-actions-grid">
                    <n-button 
                      v-if="!audioReady"
                      type="warning" 
                      size="medium"
                      @click="generateTestAudio"
                      :loading="testingVoice"
                      class="action-btn"
                    >
                      🎵 生成测试音频
                    </n-button>
                    
                    <n-button 
                      v-if="audioReady"
                      type="primary" 
                      size="medium"
                      @click="replayCurrentAudio"
                      :loading="replayingAudio"
                      class="action-btn"
                    >
                      🔄 重新播放
                    </n-button>
                    
                    <n-button 
                      type="success" 
                      size="medium"
                      @click="saveVoiceWithName"
                      :loading="savingVoice"
                      class="action-btn"
                    >
                      💾 保存到语音库
                    </n-button>
                  </div>
                  <p class="voice-usage-hint">保存后可在上方语音设置中选择使用</p>
                </div>
              </div>

                        <!-- Cloned Voice ID Display -->
          <div v-if="clonedVoiceId" class="cloned-voice-info">
            <div class="voice-id-card">
              <h4>你的专属音色</h4>
              <div class="voice-name-display">
                <div class="voice-info-row">
                  <span class="voice-label">名称:</span>
                  <span class="voice-name">{{ getVoiceDisplayName() }}</span>
                </div>
                <div class="voice-info-row">
                  <span class="voice-label">语音ID:</span>
                  <div class="voice-id-container">
                    <code class="voice-id">{{ clonedVoiceId }}</code>
                    <n-button size="small" @click="copyVoiceId" class="copy-btn">
                      复制
                    </n-button>
                  </div>
                </div>
              </div>
            </div>
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
import { ref, reactive, onMounted, watch, nextTick, onUnmounted, toRaw } from 'vue'
import { useShow } from '../hooks/useShow'
import type { ChatLLMConfig, TTSLLMConfig, TTSVoice } from '../types/llm'

const { getLLMConfig } = useShow()


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
  model: 'cosyvoice-v2',
  apiKey: '',
  baseUrl: '',
  parameters: {
    text_type: "PlainText",
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
const savingVoice = ref(false)
const voiceUrl = ref('')
const clonedVoiceId = ref<string | null>(null)

// 自定义语音名称
const customVoiceName = ref('')
const voiceNameError = ref('')

// 自定义语音内容相关
const voiceInputEnabled = ref(false)
const customVoiceText = ref('')
const testingVoice = ref(false)

// 新的统一测试文本和音频播放状态
const testText = ref('')
const audioReady = ref(false)
const replayingAudio = ref(false)
const currentAudioBlob = ref<Blob | null>(null)

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

// 音色克隆状态
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
    await window.api.setChatLLMConfig(toRaw(chatConfig))
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
    // 模拟
    await new Promise(resolve => setTimeout(resolve, 1000))
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
    await window.api.setTTSLLMConfig(toRaw(ttsConfig))
    showNotification('success', 'tts配置保存成功')
  } catch (error) {
    showNotification('error', 'tts配置保存失败')
  } finally {
    savingTTS.value = false
  }
}


// 验证语音名称
const validateVoiceName = () => {
  const name = customVoiceName.value.trim()
  
  if (!name) {
    voiceNameError.value = '请输入语音名称'
    return false
  }
  
  if (name.length < 2) {
    voiceNameError.value = '名称至少需要2个字符'
    return false
  }
  
  if (name.length > 20) {
    voiceNameError.value = '名称不能超过20个字符'
    return false
  }
  
  // 只允许字母、数字、中文，不允许空格和特殊字符
  const validPattern = /^[a-zA-Z0-9\u4e00-\u9fa5]+$/
  if (!validPattern.test(name)) {
    voiceNameError.value = '只能使用字母、数字和中文'
    return false
  }
  
  voiceNameError.value = ''
  return true
}

// 生成语音ID预览
const generateVoiceIdPreview = () => {
  const name = customVoiceName.value.trim()
  if (!name) {
    return 'voice_custom_预览'
  }
  
  // 将中文和特殊字符转换为拼音或移除
  let cleanName = name
    .replace(/[\u4e00-\u9fa5]/g, 'cn') // 中文替换为cn
    .replace(/[^a-zA-Z0-9]/g, '') // 移除其他特殊字符
    .toLowerCase()
    .substring(0, 10) // 限制长度
  
  if (!cleanName) {
    cleanName = 'custom'
  }
  
  return `voice_${cleanName}_${Date.now().toString().slice(-4)}`
}

// 处理音色克隆 （实际上还没实现，只是个占位）
const processVoiceClone = async () => {
  if (!voiceUrl.value.trim()) {
    showNotification('warning', '请先输入语音文件的URL链接')
    return
  }

  // 验证语音名称
  if (!validateVoiceName()) {
    showNotification('warning', '请检查语音名称格式')
    return
  }

  processingVoice.value = true
  cloneStatus.value = {
    type: 'processing',
    message: '正在从URL下载并克隆语音... 这可能需要几分钟，请保持联网'
  }

  try {
    const res = await window.api.cloneVoice(voiceUrl.value);
    // 克隆失败
    if(res.code === 400) {
      throw new Error(res.message);
    }
    clonedVoiceId.value = res.data!;
    
    // 使用自定义名称生成语音ID
    const customName = customVoiceName.value.trim()
    let cleanName = customName
      .replace(/[\u4e00-\u9fa5]/g, 'cn') // 中文替换为cn
      .replace(/[^a-zA-Z0-9]/g, '') // 移除其他特殊字符
      .toLowerCase()
      .substring(0, 10) // 限制长度
    
    if (!cleanName) {
      cleanName = 'custom'
    }
    
    cloneStatus.value = {
      type: 'success',
      message: `音色克隆完成! 你的"${customName}"音色已经准备好使用了，请在上方语音设置中使用这个音色ID并保存配置！`
    }
    showNotification('success', `语音"${customName}"克隆完成! ID: ${clonedVoiceId.value}`)
  } catch (error) {
    cloneStatus.value = {
      type: 'error',
      message: '音色克隆失败. 请确保URL链接有效且指向正确的音频文件格式(支持mp3和wav格式)并且文件大小≤10MB，声音时长为10-20s以内，最后保证音频文件是有声音的'
    }
    showNotification('error', '音色克隆失败')
  } finally {
    processingVoice.value = false
  }
}

// 统一的克隆并测试语音功能
const cloneAndTestVoice = async () => {
  if (!voiceUrl.value.trim()) {
    showNotification('warning', '请先输入语音文件的URL链接')
    return
  }

  if (!validateVoiceName()) {
    showNotification('warning', '请检查语音名称格式')
    return
  }

  if (!testText.value.trim()) {
    showNotification('warning', '请输入测试语音内容')
    return
  }

  processingVoice.value = true
  audioReady.value = false
  currentAudioBlob.value = null

  cloneStatus.value = {
    type: 'processing',
    message: '正在从URL下载并克隆语音... 这可能需要几分钟，请保持联网'
  }

  try {
    // 第一步：克隆语音
    const cloneRes = await window.api.cloneVoice(voiceUrl.value);
    if(cloneRes.code === 400) {
      throw new Error(cloneRes.message);
    }
    clonedVoiceId.value = cloneRes.data!;
    
    cloneStatus.value = {
      type: 'success',
      message: `音色克隆完成! 你的"${customVoiceName.value.trim()}"音色已经准备好了，现在正在生成测试音频...`
    }
    showNotification('success', `语音"${customVoiceName.value.trim()}"克隆完成! ID: ${clonedVoiceId.value}`)

    // 第二步：生成测试音频（异步进行，不阻塞UI）
    generateTestAudio()

  } catch (error) {
    cloneStatus.value = {
      type: 'error',
      message: '音色克隆失败. 请确保URL链接有效且指向正确的音频文件格式'
    }
    showNotification('error', `克隆失败: ${error}`)
  } finally {
    processingVoice.value = false
  }
}

// 生成测试音频（独立函数）
const generateTestAudio = async () => {
  if (!clonedVoiceId.value || !testText.value.trim()) {
    showNotification('warning', '请确保语音已克隆且测试文本不为空')
    return
  }

  testingVoice.value = true
  try {
    // 创建音色对象
    const voice = {
      name: customVoiceName.value.trim(),
      voice: clonedVoiceId.value,
      createdAt: new Date()
    }

    // 生成音频并收集数据
    let audioChunks: ArrayBuffer[] = []
    let isCollecting = true
    
    const audioChunkListener = (event: Event, audio: Buffer) => {
      if (isCollecting) {
        audioChunks.push(audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength))
      }
    }

    // 注册监听器
    window.api.onAudioChunk(audioChunkListener)

    // 开始生成音频
    const ttsRes = await window.api.listenTTSVoiceSample(voice, testText.value)
    if (ttsRes.code === 400) {
      throw new Error(ttsRes.message)
    }

    // 等待音频数据收集（更简单的方式）
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 停止收集并清理监听器
    isCollecting = false
    window.api.removeAllAudioChunkListeners()

    // 创建音频Blob并设置到播放器
    if (audioChunks.length > 0) {
      currentAudioBlob.value = new Blob(audioChunks, { type: 'audio/mpeg' })
      
      // 等待DOM更新后设置音频
      await nextTick()
      const audioPlayer = document.querySelector('.voice-audio-player') as HTMLAudioElement
      if (audioPlayer && currentAudioBlob.value) {
        audioPlayer.src = URL.createObjectURL(currentAudioBlob.value)
        audioPlayer.load()
        audioReady.value = true
        showNotification('success', '测试音频已生成，点击播放按钮试听！')
        
        // 更新状态消息
        cloneStatus.value = {
          type: 'success',
          message: `音色克隆和测试完成! 你的"${customVoiceName.value.trim()}"音色已经准备好，点击播放按钮试听吧！`
        }
      }
    } else {
      showNotification('warning', '音频生成可能还在进行中，请稍后点击重新播放按钮')
    }

  } catch (error) {
    showNotification('error', `音频生成失败: ${error}`)
    window.api.removeAllAudioChunkListeners()
  } finally {
    testingVoice.value = false
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

// 获取语音显示名称
const getVoiceDisplayName = () => {
  return customVoiceName.value || '自定义语音'
}

// 重新播放当前音频
const replayCurrentAudio = async () => {
  if (!currentAudioBlob.value) {
    // 如果没有音频但有语音ID，尝试重新生成
    if (clonedVoiceId.value && testText.value.trim()) {
      showNotification('info', '正在重新生成音频...')
      await generateTestAudio()
      return
    } else {
      showNotification('warning', '没有可播放的音频，请重新生成')
      return
    }
  }

  replayingAudio.value = true
  try {
    const audioPlayer = document.querySelector('.voice-audio-player') as HTMLAudioElement
    if (audioPlayer) {
      audioPlayer.currentTime = 0
      await audioPlayer.play()
    }
  } catch (error) {
    showNotification('error', '播放失败')
  } finally {
    replayingAudio.value = false
  }
}

// 音频播放结束事件
const onAudioEnded = () => {
  replayingAudio.value = false
}

// 保存语音到语音库，如果语音库中存在一个同名的音色，则删除原来的音色，并追加现在的音色到音色库中
const saveVoiceWithName = async () => {
  if (!clonedVoiceId.value || !customVoiceName.value.trim()) {
    showNotification('warning', '请确保语音ID和名称都已填写')
    return
  }

  savingVoice.value = true
  try {
    const res = await window.api.addTTSVoice({
      name: customVoiceName.value,
      voice: clonedVoiceId.value,
      createdAt: new Date()
    })
    if(res.code === 400) {
      throw new Error(res.message);
    }
    showNotification('success', `语音"${customVoiceName.value}"已保存到语音库，主人可以在上方选择这个音色了哟~`)
  } catch (error) {
    showNotification('error', '保存语音失败')
    console.log(error)
  } finally {
    savingVoice.value = false
  }
}

// 测试自定义语音内容
const testCustomVoiceText = async () => {
  if (!clonedVoiceId.value || !customVoiceText.value.trim()) {
    showNotification('warning', '请确保语音ID和文本内容都已填写')
    return
  }

  testingVoice.value = true
  try {
    // 创建音色对象
    const voice: TTSVoice = {
      name: getVoiceDisplayName(),
      voice: clonedVoiceId.value,
      createdAt: new Date()
    }

    // 调用TTS试听API
    const res = await window.api.listenTTSVoiceSample(voice, customVoiceText.value)
    if (res.code === 400) {
      throw new Error(res.message)
    }

    showNotification('success', '正在生成语音，请稍等片刻...')
    
    // 设置音频事件监听器
    let audioChunks: ArrayBuffer[] = []
    let mediaSource: MediaSource | null = null
    
    // 创建MediaSource用于流式播放
    const audioPlayer = document.querySelector('.voice-audio-player') as HTMLAudioElement
    if (audioPlayer) {
      mediaSource = new MediaSource()
      audioPlayer.src = URL.createObjectURL(mediaSource)
      // 关键：设置 preload 但不自动播放
      audioPlayer.preload = 'auto'
      audioPlayer.autoplay = false
      
      mediaSource.addEventListener('sourceopen', () => {
        const sourceBuffer = mediaSource!.addSourceBuffer('audio/mpeg')
        
        // 监听音频块事件
        const handleAudioChunk = (event: Event, audio: Buffer) => {
          audioChunks.push(audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength))
          
          if (!sourceBuffer.updating) {
            try {
              sourceBuffer.appendBuffer(audio)
            } catch (err) {
              console.error('Error appending audio buffer:', err)
            }
          }
        }
        
        // 监听TTS完成事件
        const handleTTSFinished = () => {
          window.api.removeAllAudioChunkListeners()
          // 音频加载完成，但不自动播放
          showNotification('success', '语音已加载到播放器，点击播放按钮即可试听')
          testingVoice.value = false
        }
        
        // 注册事件监听器
        window.api.onAudioChunk(handleAudioChunk)
        
        // 自动清理（30秒后，防止事件监听器泄漏）
        setTimeout(() => {
          if (testingVoice.value) {
            handleTTSFinished()
            showNotification('warning', '语音生成超时，请重试')
          }
        }, 30000)
      })
    }

  } catch (error) {
    testingVoice.value = false
    showNotification('error', `语音生成失败: ${error}`)
  }
}

// 清除URL和相关数据
const clearVoiceData = () => {
  voiceUrl.value = ''
  customVoiceName.value = ''
  voiceNameError.value = ''
  cloneStatus.value = null
  clonedVoiceId.value = null
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

onMounted(async () => {
  // 获取llm配置
  const { chatLLMConfig, ttsLLMConfig } = await getLLMConfig()
  console.log(chatLLMConfig, ttsLLMConfig)
  if (chatLLMConfig) {
    chatConfig.baseUrl = chatLLMConfig.baseUrl
    chatConfig.apiKey = chatLLMConfig.apiKey
    chatConfig.model = chatLLMConfig.model
  }
  if (ttsLLMConfig) {
    ttsConfig.model = ttsLLMConfig.model
    ttsConfig.apiKey = ttsLLMConfig.apiKey
    ttsConfig.baseUrl = ttsLLMConfig.baseUrl
    ttsConfig.parameters.voice = ttsLLMConfig.parameters.voice
    ttsConfig.parameters.rate = ttsLLMConfig.parameters.rate
    ttsConfig.parameters.pitch = ttsLLMConfig.parameters.pitch
    ttsConfig.parameters.volume = ttsLLMConfig.parameters.volume
    ttsConfig.parameters.sample_rate = ttsLLMConfig.parameters.sample_rate
  }

  // 设置默认测试文本
  testText.value = '你好，主人，欢迎试听我的音色呢'
  
  // 显示一个示例克隆语音ID
  // clonedVoiceId.value = 'voice_custom_123456'

  // 添加滚动事件监听器
  const container = document.getElementById('config')
  if (container) {
    container.addEventListener('scroll', checkScrollHints)
    window.addEventListener('resize', checkScrollHints)
  }
});

onUnmounted(() => {
  // 清理事件监听器
  const container = document.getElementById('config')
  if (container) {
    container.removeEventListener('scroll', checkScrollHints)
    window.removeEventListener('resize', checkScrollHints)
  }
  window.api.removeAllAudioChunkListeners()
})
</script>

<style lang="scss" scoped>
#config {
  width: 100%;
  height: 100%;
  background-color: $system-bgc;
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
  }
  
  &:active {
    transform: translateY(-4px) scale(1.01);
  }
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



.voice-usage-hint {
  font-size: 11px;
  color: $font-gray;
  opacity: 0.7;
  margin: 0;
  font-style: italic;
}

// Voice Naming Styles
.voice-naming {
  background: linear-gradient(135deg, $item-bg-start 0%, $item-bg-end 100%);
  border: 2px solid $border-orange-300;
  border-radius: 10px;
  padding: 20px;
  margin: 20px 0;
  
  label {
    font-size: 15px;
    font-weight: 600;
    color: $font-gray;
    margin-bottom: 10px;
    display: block;
  }
}



.voice-name-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-name-input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.voice-name-input {
  border-radius: 8px;
  
  &.n-input--focus {
    border-color: $accent-pink-dark;
  }
}

.voice-id-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, $bg-white-100 0%, $bg-white-200 100%);
  border: 1px solid $border-orange-300;
  border-radius: 6px;
  
  .preview-label {
    font-size: 12px;
    color: $font-gray;
    font-weight: 500;
  }
  
  .preview-id {
    background: $bg-white-200;
    color: $font-gray;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: bold;
    border: 1px solid $border-orange-300;
  }
}

.voice-name-error {
  color: #d32f2f;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  background: rgba(211, 47, 47, 0.1);
  border: 1px solid rgba(211, 47, 47, 0.3);
  border-radius: 4px;
}

.voice-name-hint {
  font-size: 11px;
  color: $font-gray;
  opacity: 0.8;
  
  span {
    font-style: italic;
  }
}

.url-hint {
  margin-top: 6px;
  font-size: 11px;
  color: $font-gray;
  opacity: 0.8;
  
  span {
    font-style: italic;
  }
}

// Updated voice display styles
.voice-name-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .voice-label {
    font-weight: 600;
    color: $font-gray;
    min-width: 70px;
    font-size: 12px;
  }
  
  .voice-name {
    color: $accent-pink-dark;
    font-weight: 600;
    font-size: 14px;
    background: $bg-white-200;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid $border-orange-300;
  }
}

.voice-id-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  
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
    word-break: break-all;
  }
  
  .copy-btn {
    padding: 4px 8px;
    font-size: 11px;
    flex-shrink: 0;
  }
}

// Audio Player Styles
.audio-player-section {
  margin: 20px 0;
  padding: 15px;
  background: linear-gradient(135deg, $bg-white-100 0%, $bg-white-200 100%);
  border: 1px solid $border-orange-300;
  border-radius: 8px;
  
  h5 {
    margin: 0 0 12px 0;
    color: $font-gray;
    font-size: 14px;
    font-weight: 600;
  }
}

.audio-player-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voice-audio-player {
  width: 100%;
  max-width: 400px;
  height: 40px;
  border-radius: 6px;
  outline: none;
  
  &::-webkit-media-controls-panel {
    background-color: $bg-white-100;
    border-radius: 6px;
  }
  
  &::-webkit-media-controls-play-button,
  &::-webkit-media-controls-pause-button {
    background-color: $accent-pink-dark;
    border-radius: 50%;
  }
  
  &::-webkit-media-controls-timeline {
    background-color: $bg-white-200;
    border-radius: 4px;
  }
  
  &::-webkit-media-controls-current-time-display,
  &::-webkit-media-controls-time-remaining-display {
    color: $font-gray;
    font-size: 11px;
  }
}

.audio-hint {
  font-size: 11px;
  color: $font-gray;
  opacity: 0.7;
  margin: 0;
  font-style: italic;
}

// Voice Input Section Styles
.voice-input-section {
  margin-top: 20px;
  padding: 15px;
  background: linear-gradient(135deg, $bg-white-100 0%, $bg-white-200 100%);
  border: 1px solid $border-orange-300;
  border-radius: 8px;
}

.voice-input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  
  h5 {
    margin: 0;
    color: $font-gray;
    font-size: 14px;
    font-weight: 600;
  }
}

.voice-input-toggle {
  flex-shrink: 0;
}

.voice-input-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voice-text-input {
  width: 100%;
  border-radius: 6px;
  
  &:deep(.n-input__textarea) {
    border-radius: 6px;
    resize: vertical;
    min-height: 60px;
  }
}



.voice-input-hint {
  font-size: 11px;
  color: $font-gray;
  opacity: 0.7;
  margin: 0;
  font-style: italic;
  text-align: center;
}

// Voice Actions Section Styles
.voice-actions-section {
  margin: 20px 0 15px 0;
}

.voice-actions-grid {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.action-btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  min-width: 120px;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
}

// Clone button styles  
.clone-btn {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 20px;
  transition: all 0.2s ease;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
  }
  
  &:active {
    transform: translateY(0);
  }
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
  
  .voice-naming {
    padding: 15px;
    margin: 15px 0;
    
    label {
      font-size: 14px;
    }
  }
  
  .voice-id-preview {
    padding: 6px 10px;
    
    .preview-label {
      font-size: 11px;
    }
    
    .preview-id {
      font-size: 10px;
      padding: 2px 4px;
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
  
  .voice-naming {
    padding: 12px;
    margin: 12px 0;
    
    label {
      font-size: 13px;
    }
  }
  
  .voice-id-preview {
    padding: 5px 8px;
    
    .preview-label {
      font-size: 10px;
    }
    
    .preview-id {
      font-size: 9px;
      padding: 1px 3px;
    }
  }
  
  .voice-info-row {
    .voice-label {
      min-width: 60px;
      font-size: 11px;
    }
    
    .voice-name {
      font-size: 12px;
      padding: 3px 6px;
    }
  }
  
  .voice-id-container {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    
    .voice-id {
      font-size: 11px;
      padding: 3px 6px;
    }
    
    .copy-btn {
      align-self: center;
      padding: 3px 6px;
      font-size: 10px;
    }
  }
  
  .audio-player-section {
    margin: 15px 0;
    padding: 10px;
    
    h5 {
      font-size: 13px;
      margin-bottom: 8px;
    }
  }
  
  .voice-audio-player {
    height: 35px;
    max-width: 100%;
  }
  
  .audio-hint {
    font-size: 10px;
  }
  
  .save-voice-btn {
    padding: 8px 16px;
    font-size: 13px;
  }

}
</style>