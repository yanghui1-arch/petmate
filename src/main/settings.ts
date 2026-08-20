import Store from 'electron-store';
import { NotFoundError } from './error';
import { isAppLocale } from '../types/config';
import type { SettingConfig } from '../types/config';

export type { AppLocale, SettingConfig } from '../types/config';


const store: Store<SettingConfig> = new Store<SettingConfig>({
    name: 'settings'
})

/**
 * 默认的设置
 * 默认情况下，模型处于最顶层，大小为50，专注模式关闭
 */
export const defaultSettings: SettingConfig = {
    modelSize: 50,
    focusMode: false,
    onTop: true,
    locale: 'zh-CN',
}

// 最新的设置，需要保证其一直都是最新的，因此在每一次的getSettings函数中，都要将文件中的设置赋值给他
// 在每一次的updateSettings函数中，都要将文件中的设置赋值给他
let currentSettings: SettingConfig | null = null;
let isInit: boolean = false;

export function initSettings(): void {
    if (isInit) return;
    try {
        console.log("正在初始化设置...")
        const settings: SettingConfig = getSettings();
        currentSettings = settings;
    } catch {
        updateSettings(defaultSettings);
        currentSettings = getSettings();
    } finally {
        isInit = true;
        console.log("设置初始化完成")
    }
}

/**
 * 更新设置
 * 将设置更新到文件中，并且重新从文件中获取最新的设置并赋值给currentSettings
 * @param updates 需要改变的部分设置内容
 * @returns 更新后的设置
 */
export function updateSettings(updates: Partial<SettingConfig>): SettingConfig {
    try {
        currentSettings = getSettings();
    } catch (error) {
        // 如果初始没有数据，则就启用默认的数据即可
        if (error instanceof NotFoundError) {
            currentSettings = defaultSettings;
        } else {
            throw error;
        }
    }
    (store as any).set('settings', {
        ...currentSettings,
        ...updates
    });
    currentSettings = getSettings();
    return currentSettings;
}

/**
 * 获取当前的设置
 * @returns 设置
 * @throws 如果设置不存在，则抛出NotFoundError
 */
export function getSettings(): SettingConfig {
    const storedSettings = (store as any).get('settings') as Partial<SettingConfig> | undefined;
    if (!storedSettings) {
        throw new NotFoundError('设置不存在，请初始化设置');
    }

    const settings: SettingConfig = {
        ...defaultSettings,
        ...storedSettings,
        locale: isAppLocale(storedSettings.locale) ? storedSettings.locale : defaultSettings.locale,
    };
    currentSettings = settings;
    return settings;
}

/**
 * 获取设置中的模型大小
 * @returns 模型大小
 */
export function getModelSize(): number {
    return currentSettings?.modelSize ?? 50;
}

/**
 * 获取玩家是否打开了专注模式
 * @returns 是否打开了专注模式，true为打开，false为关闭
 */
export function getFocusMode(): boolean {
    return currentSettings?.focusMode ?? false;
}

/**
 * 获取玩家是否打开了置顶模式
 * @returns 是否打开了置顶模式，true为打开，false为关闭
 */
export function getOnTop(): boolean {
    return currentSettings?.onTop ?? false;
}
