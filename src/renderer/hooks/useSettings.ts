import { SettingConfig } from "../types/config"

export function useSettings() {

    /**
     * 获取设置
     * 成功的话会返回设置，如果出现错误的话，会返回null
     * @returns 设置
     */
    const getSettings = async ():Promise<SettingConfig | null> => {
        try {
            const res = await window.api.getSettings()
            if (res.code === 200) {
                return res.data ?? null
            } else {
                throw new Error(res.message)
            }
        } catch (error) {
            console.error(error)
            return null
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
        getSettings,
        updateSettings
    }
}