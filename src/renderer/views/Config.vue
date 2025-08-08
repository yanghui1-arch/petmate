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

      <!-- Main Content - Side by Side Layout -->
      <div class="side-by-side-layout">
        <!-- Left Side: Chat LLM Configuration -->
        <div class="left-panel">
          <div class="panel-header">
            <h2>聊天LLM配置</h2>
          </div>

          <div class="panel-content">
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
                    placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
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
                  <label>模型（能力从上到下递减）</label>
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
                    保存
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
                    :rows="4"
                    placeholder="在这里输入你的自定义提示词来定义Petmate的个性和行为..."
                    class="config-input"
                  />
                </div>
                <div class="form-actions">
                  <n-button
                    type="info"
                    class="save-btn"
                    @click="setChatStyle(customPrompt)"
                    :loading="settingStyle"
                  >
                    🎨 设置聊天风格
                  </n-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side: TTS Configuration -->
        <div class="right-panel">
          <div class="panel-header">
            <h2>语音合成配置</h2>
          </div>

          <div class="panel-content">
            <!-- TTS Basic Information -->
            <div class="config-card">
              <div class="card-header">
                <h3>基础设置</h3>
              </div>
              <div class="config-form">
                <div class="form-group">
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
                <div class="form-group">
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
                <div class="form-group">
                  <label>采样率</label>
                  <n-select
                    v-model:value="ttsConfig.parameters.sample_rate"
                    :options="sampleRateOptions"
                    class="config-input"
                  />
                </div>
                <div class="form-group">
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
                    保存设置
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
                <!-- Input Section - Show only when not processing and not successfully cloned -->
                <div v-if="!processingVoice && !clonedVoiceId">
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
                      <span>提示：请确保URL链接可以直接访问音频文件</span>
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
                      :autosize="{ minRows: 2, maxRows: 3 }"
                      class="config-input"
                      maxlength="200"
                      show-count
                    />
                    <div class="url-hint">
                      <span>提示：输入测试文本，克隆完成后会自动生成音频供试听</span>
                    </div>
                  </div>

                  <!-- Clone and Test Voice Action -->
                  <div class="form-actions">
                    <n-button
                      type="success"
                      class="clone-btn"
                      @click="cloneAndTestVoice"
                      :disabled="!voiceUrl.trim() || !customVoiceName.trim() || !!voiceNameError || !testText.trim()"
                    >
                      克隆并试听"{{ customVoiceName.trim() }}"
                    </n-button>
                  </div>
                </div>

                <!-- Loading Status - Show only during processing -->
                <div v-if="processingVoice" class="clone-status">
                  <div class="status-indicator processing">
                    <n-icon size="20">
                      <svg viewBox="0 0 24 24">
                        <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
                      </svg>
                    </n-icon>
                    <span>正在克隆语音，请稍候...</span>
                  </div>
                </div>

                <!-- Error Status - Show only on error -->
                <div v-if="!processingVoice && cloneStatus && cloneStatus.type === 'error'" class="clone-status">
                  <div class="status-indicator error">
                    <n-icon size="20">
                      <svg viewBox="0 0 24 24">
                        <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                      </svg>
                    </n-icon>
                    <span>{{ cloneStatus.message }}</span>
                  </div>
                  <div class="form-actions" style="margin-top: 15px;">
                    <n-button type="default" @click="resetToInput">重新开始</n-button>
                  </div>
                </div>

                <!-- Audio Player Section - Show only when successfully cloned -->
                <div v-if="clonedVoiceId && !processingVoice && (!cloneStatus || cloneStatus.type !== 'error')" class="audio-player-section">
                  <div class="success-info">
                    <h5>克隆成功！</h5>
                    <div class="voice-info">
                      <span>音色名称: <strong>{{ getVoiceDisplayName() }}</strong></span>
                    </div>
                  </div>

                  <!-- Edit test text -->
                  <div class="form-group" style="margin-bottom: 15px;">
                    <label>测试文本</label>
                    <n-input
                      v-model:value="testText"
                      type="textarea"
                      placeholder="输入想要用这个音色说的话..."
                      :autosize="{ minRows: 2, maxRows: 3 }"
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

                  <!-- Actions -->
                  <div class="voice-actions-section">
                    <div class="voice-actions-grid">
                      <n-button
                        v-if="!audioReady"
                        type="warning"
                        size="small"
                        @click="generateTestAudio"
                        :loading="testingVoice"
                        class="action-btn"
                      >
                        生成测试音频
                      </n-button>

                      <n-button
                        v-if="audioReady"
                        type="primary"
                        size="small"
                        @click="replayCurrentAudio"
                        :loading="replayingAudio"
                        class="action-btn"
                      >
                        🔄重新播放
                      </n-button>

                      <n-button
                        type="success"
                        size="small"
                        @click="saveVoiceWithName"
                        :loading="savingVoice"
                        class="action-btn"
                      >
                        保存到语音库
                      </n-button>

                      <n-button
                        type="default"
                        size="small"
                        @click="resetToInput"
                        class="action-btn"
                      >
                        ➕克隆新语音
                      </n-button>
                    </div>
                    <p class="voice-usage-hint">保存后可在上方语音设置中选择使用</p>
                  </div>
                </div>
              </div>
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
import { resolve } from 'path'

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
const testingVoice = ref(false)

// 新的统一测试文本和音频播放状态
const testText = ref('')
const audioReady = ref(false)
const replayingAudio = ref(false)
const currentAudioBlob = ref<Blob | null>(null)
const voiceAudioPlayer = ref<HTMLAudioElement | null>(null)

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

// 可选择的模型
const modelOptions = [
  { label: 'deepseek-r1-0528', value: 'deepseek-r1' },
  { label: 'qwen-max', value: 'qwen-max' },
  { label: 'qwen3-235b', value: 'qwen3-235b-a22b-instruct-2507' },
  { label: 'deepseek-v3', value: 'deepseek-v3' },
  { label: 'qwen2.5-72b', value: 'qwen2.5-72b' },
]

// 可选择的语音
const MAX_SHOW_VOICE_COUNT = 5
const voiceOptions = ref<{ label: string, value: string }[]>([])

// 获取音色列表
const getTTSVoiceList = async () => {
  const res = await window.api.getTTSVoiceList()
  if(res.code === 400) {
    throw new Error(res.message)
  }
  if (res.data) {
    voiceOptions.value = res.data.map(voice => ({ label: voice.name, value: voice.voice }))
  }
}

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

// 获取聊天风格
const getChatStyle = async () => {
  try {
    const res = await window.api.getChatPrompt()
    if(res.code === 400) {
      throw new Error(res.message)
    }
    if(res.data) {
      customPrompt.value = res.data
    }
  } catch (error) {
    console.log(error)
  }
}


// 设置聊天风格
const setChatStyle = async (prompt: string) => {
  settingStyle.value = true
  try {
    const res = await window.api.setChatPrompt(prompt)
    if(res.code === 400) {
      throw new Error(res.message)
    }
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

  // 清除之前的结果 (但保留输入数据)
  clonedVoiceId.value = null
  audioReady.value = false
  currentAudioBlob.value = null
  cloneStatus.value = null
  processingVoice.value = true

  try {
    // 克隆语音
    const cloneRes = await window.api.cloneVoice(voiceUrl.value);
    if(cloneRes.code === 400) {
      throw new Error(cloneRes.message);
    }
    clonedVoiceId.value = cloneRes.data!;

    // 清除状态，让成功界面显示
    cloneStatus.value = null
    showNotification('success', `语音"${customVoiceName.value.trim()}"克隆完成! ID: ${clonedVoiceId.value}`)

    // 生成测试音频（异步进行）
    generateTestAudio()

  } catch (error) {
    cloneStatus.value = {
      type: 'error',
      message: '音色克隆失败. 请确保URL链接有效且指向正确的音频文件格式'
    }
    showNotification('error', `音色克隆失败. 请确保URL链接有效且指向正确的音频文件格式`)
  } finally {
    processingVoice.value = false
  }
}

/**
 * 生成测试音频，可以让玩家直接听
 */
const generateTestAudio = async () => {
  if (!clonedVoiceId.value || !testText.value.trim()) {
    showNotification('warning', '请确保语音已克隆且测试文本不为空')
    return
  }

  testingVoice.value = true
  try {
    const voice = {
      name: customVoiceName.value.trim(),
      voice: clonedVoiceId.value,
      createdAt: new Date()
    }
    // 生成的音频数据
    let audioChunks: ArrayBuffer[] = []

    const waitForTTS = new Promise<boolean>((resolve, reject) => {
        const audioChunkListener = (_: Event, audio: Buffer) => {
            // @ts-ignore
            // 先忽视一下这个问题，之后把这个问题好好解决一下
            audioChunks.push(audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength))
        }

        const ttsFinishedListener = async (_: Event) => {
            if (audioChunks.length > 0) {
                currentAudioBlob.value = new Blob(audioChunks, { type: 'audio/mpeg' })
                await nextTick()
                const audioPlayer = document.querySelector('.voice-audio-player') as HTMLAudioElement
                if (audioPlayer && currentAudioBlob.value) {
                    audioPlayer.src = URL.createObjectURL(currentAudioBlob.value)
                    audioPlayer.load()
                    audioReady.value = true
                    showNotification('success', '测试音频已生成，点击播放按钮试听！')
                }
            } else {
                showNotification('warning', '试听音频生成出现问题，但是可以正常使用该音色聊天。')
            }
            testingVoice.value = false
            resolve(true)
        }

        const ttsFailedListener = (_: Event) => {
            reject(new Error())
        }

        // 注册监听
        window.api.onAudioChunk(audioChunkListener)
        window.api.onTTSFinished(ttsFinishedListener)
        window.api.onTTSFailed(ttsFailedListener)
    })

    // 开始生成音频
    const ttsRes = await window.api.listenTTSVoiceSample(voice, testText.value)
    if (ttsRes.code === 400) {
      throw new Error(ttsRes.message)
    }

    await waitForTTS

  } catch (error) {
    showNotification('error', `音频生成失败: ${error}`)
  } finally {
    testingVoice.value = false
    window.api.removeAllTTSFinishedListeners()
    window.api.removeAllAudioChunkListeners()
    window.api.removeAllTTSFailedListeners()
  }
}


// 获取语音显示名称
const getVoiceDisplayName = () => {
  return customVoiceName.value || '自定义语音'
}

/*
 * 重新播放当前音频
 */
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
    if (voiceAudioPlayer.value) {
      voiceAudioPlayer.value.currentTime = 0
      await voiceAudioPlayer.value.play()
    } else {
      showNotification('error', '音频播放器未准备就绪')
    }
  } catch (error) {
    console.error('Audio play error:', error)
    showNotification('error', `播放失败: ${error}`)
  } finally {
    replayingAudio.value = false
  }
}

// 音频播放结束事件
const onAudioEnded = () => {
  replayingAudio.value = false
}

// 清理音频资源
const cleanupAudioResources = () => {
  if (voiceAudioPlayer.value && voiceAudioPlayer.value.src) {
    URL.revokeObjectURL(voiceAudioPlayer.value.src)
    voiceAudioPlayer.value.src = ''
  }
  currentAudioBlob.value = null
  audioReady.value = false
}

// 重置到输入状态
const resetToInput = () => {
  cleanupAudioResources()
  clonedVoiceId.value = null
  cloneStatus.value = null
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
    // voiceOptions里最下面的一定是最新的，所以把上面的删了，只保留MAX_SHOW_VOICE_COUNT - 1个，然后再把这个新的克隆音色给+进去
    if(voiceOptions.value.length > MAX_SHOW_VOICE_COUNT) {
      voiceOptions.value.splice(0, voiceOptions.value.length - MAX_SHOW_VOICE_COUNT + 1)
    }
    voiceOptions.value.push({ label: customVoiceName.value, value: clonedVoiceId.value })
    showNotification('success', `语音"${customVoiceName.value}"已保存到语音库，主人可以在上方选择这个音色了哟~`)
  } catch (error) {
    showNotification('error', '保存语音失败')
    console.log(error)
  } finally {
    savingVoice.value = false
  }
}

onMounted(async () => {
  // 获取llm配置
  const { chatLLMConfig, ttsLLMConfig } = await getLLMConfig()
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

  // 获取聊天风格
  getChatStyle()

  // 获取音色列表
  getTTSVoiceList()

  // 设置默认测试文本
  testText.value = '你好，主人，欢迎试听我的音色呢'
});

onUnmounted(() => {
  window.api.removeAllAudioChunkListeners()
  window.api.removeAllTTSFinishedListeners()
  window.api.removeAllTTSFailedListeners()
  cleanupAudioResources()
})
</script>

<style lang="scss" scoped>
#config {
  width: 100%;
  height: 100%;
  background-color: $system-bgc;
}

.config-container {
  height: 100vh;
  padding: 8px;
  display: flex;
  flex-direction: column;
  background-color: $system-bgc;
}

.side-by-side-layout {
  display: flex;
  gap: 8px;
  flex: 1;
  min-height: 0;
}

.left-panel, .right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: $color-white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 0;
}

.panel-header {
  padding: 8px;
  border-radius: 6px 6px 0 0;

  h2 {
    font-size: 1em;
    color: $font-gray;
    margin: 0;
    font-weight: bold;
    text-align: center;
  }
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: $color-white;
  min-height: 0;
}

.config-card {
  background: $color-white-200;
  border-radius: 6px;
  padding: 8px;
  border: 1px solid $color-gray-200;
}

.card-header {
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid $color-gray-200;

  h3 {
    font-size: 0.9em;
    color: $font-gray;
    margin: 0;
    font-weight: bold;
  }
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 3px;

  label {
    font-size: 11px;
    color: $font-gray;
    font-weight: 600;
  }
}

.config-input, .config-slider {
  border-radius: 4px;
}

.config-slider {
  margin: 4px 0;
}

.slider-value {
  font-size: 10px;
  color: $font-gray;
  background: $color-white-100;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid $color-gray-200;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 6px;
}

.save-btn, .clone-btn, .action-btn {
  padding: 4px 12px;
  font-size: 11px;
  border-radius: 8px;
}

.voice-naming {
  border-radius: 6px;
  padding: 8px;
  margin: 6px 0;
  border: 1px solid $border-orange-300;
}

.voice-name-error {
  color: $color-red;
  font-size: 10px;
  padding: 2px 4px;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(255, 0, 0, 0.3);
}

.audio-player-section {
  background: $color-white-100;
  border-radius: 6px;
  padding: 6px;
  margin: 6px 0;
  border: 1px solid $color-gray-200;
}

.voice-audio-player {
  width: 100%;
  height: 30px;
  border-radius: 4px;
}

.voice-actions-grid {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: wrap;
}

.success-info {
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
  border-radius: 6px;
  padding: 6px;
  border: 1px solid #4caf50;

  h5 {
    font-size: 10px;
    color: #2e7d32;
    margin: 0 0 4px 0;
    font-weight: bold;
  }
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 10px;
  border: 1px solid;

  &.processing {
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    color: #1976d2;
    border-color: #64b5f6;
  }

  &.error {
    background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
    color: #d32f2f;
    border-color: #e57373;
  }
}

.notification-toast {
  position: fixed;
  top: 15px;
  right: 15px;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  border: 1px solid;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  &.success {
    background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
    color: #388e3c;
    border-color: #4caf50;
  }

  &.error {
    background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
    color: #d32f2f;
    border-color: #f44336;
  }

  &.warning {
    background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
    color: #f57c00;
    border-color: #ff9800;
  }
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.url-hint, .voice-name-hint, .audio-hint, .voice-usage-hint {
  font-size: 9px;
  color: $font-gray;
  opacity: 0.8;
}

// Improved scrollbar for better visual feedback
.panel-content {
  scrollbar-width: thin;
  scrollbar-color: $border-orange-300 transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: $color-white-100;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: $border-orange-300;
    border-radius: 3px;
    border: 1px solid $color-white;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: $accent-pink-dark;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-indicator.processing svg {
  animation: spin 1s linear infinite;
}
</style>
