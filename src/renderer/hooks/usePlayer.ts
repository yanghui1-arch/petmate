import { ref, readonly } from 'vue'
import type { Response } from '../../types/response'
import { PlayerInfo } from '../types/player'
import { ChatMessage } from '../types/llm'


// 全局状态 - 单个实例共享整个应用
const playerData = ref<PlayerInfo | null>(null)
const error = ref<string | null>(null)

export function usePlayer() {
    /**
     * 获取玩家的数据
     */
    const initPlayerData = async (): Promise<void> => {
        try {
            await refreshPlayerData()
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred'
            console.error('Failed to init player data:', err)
        }
    }

    // 重新获取玩家数据
    const refreshPlayerData = async (): Promise<void> => {
        try {
            const response: Response<PlayerInfo> = await window.api.getCurrentPlayerData()
            if (response.code === 200 && response.data) {
                playerData.value = response.data
            } else {
                throw new Error(response.message || 'Failed to load player data')
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred'
            console.error('Failed to refresh player data:', err)
        }
    };

    // 消耗物品
    const consumeItem = async (itemId: number, count: number, petmateId: number): Promise<boolean> => {
        try {
            const response = await window.api.consumeItem(itemId, count, petmateId)
            if (response.code === 200) {
                // 消耗物品后重新获取玩家数据
                await refreshPlayerData()
                return true
            } else {
                throw new Error(response.message || 'Failed to consume item')
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred'
            console.error('Failed to consume item:', err)
            return false
        }
    }

    // 购买物品
    const buyItem = async (itemId: number, count: number): Promise<boolean> => {
        try {
            const response = await window.api.buyItem(itemId, count)
            if (response.code === 200) {
                // 购买物品后重新获取玩家数据
                await refreshPlayerData()
                return true
            } else {
                throw new Error(response.message || 'Failed to buy item')
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred'
            console.error('Failed to buy item:', err)
            return false
        }
    }

    // 开启活动
    const startActivity = async (petmateId: number, activityId: number): Promise<boolean> => {
        try {
            const response = await window.api.startActivity(petmateId, activityId)
            if (response.code === 200) {
                // 开启活动后重新获取玩家数据
                await refreshPlayerData()
                return true
            } else {
                throw new Error(response.message || 'Failed to start activity')
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred'
            console.error('Failed to start activity:', err)
            return false
        }
    }

    // 取消活动
    const cancelActivity = async (petmateId: number): Promise<boolean> => {
        try {
            const response = await window.api.cancelActivity(petmateId)
            if (response.code === 200) {
                await refreshPlayerData()
                return true
            } else {
                throw new Error(response.message || 'Failed to cancel activity')
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred'
            console.error('Failed to cancel activity:', err)
            return false
        }
    }

    // 结束活动，取活动奖励
    const claimActivityReward = async (petmateId: number): Promise<boolean> => {
        try {
            const response = await window.api.claimActivityReward(petmateId)
            if (response.code === 200) {
                await refreshPlayerData()
                return true
            } else {
                throw new Error(response.message || 'Failed to end activity reward')
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred'
            console.error('Failed to end activity reward:', err)
            return false
        }
    }


    /**
     * 手动领取心愿奖励
     * @param petmateId petmate的id
     * @param wishId 要领取的心愿id
     * @returns 是否成功领取
     */
    const claimWishReward = async (petmateId: number, wishId: string): Promise<boolean> => {
        const res = await window.api.claimWishReward(petmateId, wishId)
        try {
            if (res.code === 200) {
                await refreshPlayerData()
                return true
            } else {
                throw new Error(res.message || 'Failed to claim wish reward')
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred'
            console.error('Failed to claim wish reward:', err)
            return false
        }
    }

    // 聊天
    const chat = async (message: ChatMessage): Promise<boolean> => {
        try {
            const response = await window.api.chat(message)
            if (response.code === 200) {
                return true
            } else {
                // 超过上下文了，需要重新发送一次chat
                if (response.code === 401) {
                    const response = await window.api.chat(message)
                    if (response.code === 200) {
                        return true
                    } else {
                        throw new Error(response.message || 'Failed to chat')
                    }
                } else {
                    throw new Error(response.message || 'Failed to chat')
                }
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred'
            console.error('Failed to chat:', err)
            return false
        }
    }

    // 返回只读引用，但提供更新方法
    return {
        // 只读数据访问
        playerData: readonly(playerData),
        error: readonly(error),

        // 数据管理方法
        refreshPlayerData,
        initPlayerData,

        // 操作方法，自动同步数据
        consumeItem,
        buyItem,
        startActivity,
        cancelActivity,
        claimActivityReward,
        claimWishReward,

        // 聊天
        chat,
    }
}