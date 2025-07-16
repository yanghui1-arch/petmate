<template>
    <div id="settings">
      <div class="settings-body">
        
        <!-- 模型大小选择 -->
        <div class="settings-item">
          <div class="settings-label"><label>模型大小</label></div>
          <n-slider class="settings-switch" v-model:value="modelMaxSize" :step="1" />
        </div>

        <!-- 专注模式 -->
        <div class="settings-item">
          <div class="settings-label"><label>专注模式</label></div>
          <n-switch class="settings-switch" v-model:value="focusActive" />
        </div>
        
        <!-- 悬浮 -->
        <div class="settings-item">
          <div class="settings-label"><label>置于最上层</label></div>
          <n-switch class="settings-switch" v-model:value="topCanvasActive" />
        </div>

      </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import { useSettings } from '../hooks/useSettings'
import { SettingConfig } from '../types/config'

const { getSettings, updateSettings } = useSettings()

const focusActive = ref(false)
const topCanvasActive = ref(true)
const modelMaxSize = ref(50)

onMounted(async () => {
  const settings: SettingConfig | null = await getSettings()
  if (settings) {
    focusActive.value = settings.focusMode
    topCanvasActive.value = settings.onTop
    modelMaxSize.value = settings.modelSize
  }
})

watch(focusActive, async (newVal) => {
  await updateSettings({ focusMode: newVal })
})
watch(topCanvasActive, async (newVal) => {
  await updateSettings({ onTop: newVal })
})
watch(modelMaxSize, async (newVal) => {
  await updateSettings({ modelSize: newVal })
})

</script>

<style lang="scss" scoped>
#settings {
  background-color: $bg-white-100;
  width: 100%;
  height: 100%;
}

.settings-body {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
  align-items: center;
  justify-content: top;
  height: 100%;
  padding-top: 30px;
  background-image: url('../assets/image/systemBg.jpg');
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  .settings-item {
    display: flex;
    background-color: $bg-white-300;
    width: 50%;
    border-radius: 10px;
    padding: 5px;
    .settings-label {
      padding: 5px;
    }
    .settings-switch {
      padding-top: 10px;
      margin-left: auto;
      width: 40%;
    }
  }
}

label {
  font-size: 16px;
  color: $font-gray;
}
</style>