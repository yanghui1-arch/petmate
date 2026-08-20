import { computed } from 'vue';
import { DEFAULT_LOCALE, i18n, setLocale } from '../i18n';
import type { AppLocale } from '../../types/config';

export function useLocale() {
  const locale = computed(() => i18n.global.locale.value as AppLocale);

  const changeLocale = async (nextLocale: AppLocale): Promise<boolean> => {
    const previousLocale = locale.value;
    setLocale(nextLocale);

    try {
      const response = await window.api.updateSettings({ locale: nextLocale });
      if (response.code === 200) return true;
    } catch (error) {
      console.error('保存语言设置失败', error);
    }

    setLocale(previousLocale || DEFAULT_LOCALE);
    return false;
  };

  return {
    locale,
    changeLocale,
  };
}
