import { SettingConfig } from "../types/config"

const settings = ref<SettingConfig | null>(null)

export function useSettings() {

    /**
     * 初始化设置
     * 成功的话会返回设置，如果出现错误的话，会返回null
     * @returns 设置
     */
    const initSettings = async ():Promise<boolean> => {
        try {
            const res = await window.api.initSettings()
            if (res.code === 200) {
                settings.value = res.data!
                return true
            } else {
                throw new Error(res.message)
            }
        } catch (error) {
            console.error(error)
            return false
        }
    }

    /**
     * 更新设置
     * 成功的话会返回true，如果出现错误的话，会返回false
     * @param updates 需要更新的设置
     * @returns 是否更新成功
     */
    const updateSettings = async (updates: Partial<SettingConfig>):Promise<boolean> => {
        try {
            const res = await window.api.updateSettings(updates)
            if (res.code === 200) {
                settings.value = res.data!
                return true
            } else {
                throw new Error(res.message)
            }
        } catch (error) {
            console.error(error)
            return false
        }
    }


    return {
        settings: readonly(settings),

        initSettings,
        updateSettings
    }
}