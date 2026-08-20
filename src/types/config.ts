export const SUPPORTED_LOCALES = ['zh-CN', 'zh-TW', 'en-US'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export interface SettingConfig {
  modelSize: number;
  focusMode: boolean;
  onTop: boolean;
  locale: AppLocale;
}

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as AppLocale);
}
