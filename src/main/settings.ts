import Store from 'electron-store';

export type SettingConfig = {
    modelSize: number;
    focusMode: boolean;
    onTop: boolean;
}

const store: Store<SettingConfig> = new Store<SettingConfig>({
    name: 'settings'
})

/**
 * 默认的设置
 */
const defaultSettings: SettingConfig = {
    modelSize: 50,
    focusMode: false,
    onTop: false
}

/**
 * 初始化设置
 * @returns 默认设置
 */
function initSettings(): SettingConfig {
    updateSettings(defaultSettings);
    return defaultSettings;
}

/**
 * 更新设置
 * @param updates 需要改变的部分设置内容
 * @returns 更新后的设置
 */
export function updateSettings(updates: Partial<SettingConfig>): SettingConfig {
    const originalSettings: SettingConfig = getSettings();
    (store as any).set('settings', {
        ...originalSettings,
        ...updates
    });
    return getSettings();
}

/**
 * 获取当前的设置
 * 如果当前没有设置，则会初始化一个默认设置
 * @returns 设置
 */
export function getSettings(): SettingConfig {
    let settings: SettingConfig | undefined = (store as any).get('settings') as SettingConfig | undefined;
    if (!settings) {
        settings = initSettings();
    }
    return settings;
}

/**
 * 获取设置中的模型大小
 * @returns 模型大小
 */
export function getModelSize(): number {
    return getSettings().modelSize;
}

/**
 * 获取玩家是否打开了专注模式
 * @returns 是否打开了专注模式，true为打开，false为关闭
 */
export function getFocusMode(): boolean {
    return getSettings().focusMode;
}

/**
 * 获取玩家是否打开了置顶模式
 * @returns 是否打开了置顶模式，true为打开，false为关闭
 */
export function getOnTop(): boolean {
    return getSettings().onTop;
}