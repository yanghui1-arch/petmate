<template>
    <div id="settings">
      <div class="settings-body">
        
        <div class="settings-item language-setting-item">
          <div class="settings-label">
            <label>{{ t('settings.language') }}</label>
            <small>{{ t('settings.languageDescription') }}</small>
          </div>
          <n-select
            class="language-select"
            :value="locale"
            :options="languageOptions"
            @update:value="handleLocaleChange"
          />
        </div>

        <!-- 模型大小选择 -->
        <div class="settings-item">
          <div class="settings-label"><label>{{ t('settings.modelSize') }}</label></div>
          <n-slider class="settings-switch" v-model:value="modelMaxSize" :step="1" />
        </div>

        <!-- 专注模式 -->
        <div class="settings-item">
          <div class="settings-label"><label>{{ t('settings.focusMode') }}</label></div>
          <n-switch class="settings-switch" v-model:value="focusActive" />
        </div>
        
        <!-- 悬浮 -->
        <div class="settings-item">
          <div class="settings-label"><label>{{ t('settings.onTop') }}</label></div>
          <n-switch class="settings-switch" v-model:value="topCanvasActive" />
        </div>

      </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettings } from '../hooks/useSettings'
import { useLocale } from '../hooks/useLocale'
import type { AppLocale } from '../../types/config'

const { settings, updateSettings } = useSettings()
const { t } = useI18n()
const { locale, changeLocale } = useLocale()

const focusActive = ref(false)
const topCanvasActive = ref(true)
const modelMaxSize = ref(50)

const languageOptions = computed(() => [
  { label: t('language.options.simplifiedChinese'), value: 'zh-CN' as AppLocale },
  { label: t('language.options.traditionalChinese'), value: 'zh-TW' as AppLocale },
  { label: t('language.options.english'), value: 'en-US' as AppLocale },
])

const handleLocaleChange = async (value: AppLocale) => {
  await changeLocale(value)
}

onMounted(async () => {
  if (settings.value) {
    focusActive.value = settings.value.focusMode
    topCanvasActive.value = settings.value.onTop
    modelMaxSize.value = settings.value.modelSize
  } else {
    console.error("设置初始化失败")
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
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .settings-switch {
      padding-top: 10px;
      margin-left: auto;
      width: 40%;
    }
    .language-select {
      width: 45%;
      margin-left: auto;
    }
  }
}

label {
  font-size: 16px;
  color: $font-gray;
}

small {
  color: rgba($font-gray, 0.7);
  font-size: 11px;
}
</style>
