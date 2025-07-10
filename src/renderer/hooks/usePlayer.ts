import { ref, readonly } from 'vue'
import type { Response } from '../../types/response'
import { PackageItemInfo } from '../../main/types/player'

// 将PlayerInfo接口定义在全局，使得在渲染层可以访问
declare global {
  interface PlayerInfo {
    steam_id?: string | null;
    name: string;
    qq?: string | null;
    petmates: any[];
    cash: number;
    items: PackageItemInfo[];
  }
}

// 全局状态 - 单个实例共享整个应用
const playerData = ref<PlayerInfo | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

export function usePlayer() {
    // 加载玩家数据
    const loadPlayerData = async (): Promise<void> => {
      if (isLoading.value) return // 防止多次同时加载
      
      isLoading.value = true
      error.value = null
      
      try {
        const response: Response<PlayerInfo> = await window.api.loadPlayerData()
        
        if (response.code === 200 && response.data) {
          playerData.value = response.data
        } else {
          throw new Error(response.message || 'Failed to load player data')
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Unknown error occurred'
        console.error('Failed to load player data:', err)
      } finally {
        isLoading.value = false
      }
    }

    // 重新获取玩家数据
    const refreshPlayerData = async (): Promise<void> => {
        await loadPlayerData()
    }

    // 更新本地玩家数据
    const updatePlayerData = (newData: Partial<PlayerInfo>): void => {
      if (playerData.value) {
        playerData.value = { ...playerData.value, ...newData }
      }
    }

    // 设置完整玩家数据
    const setPlayerData = (newData: PlayerInfo): void => {
      playerData.value = newData
    }

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

    // 返回只读引用，但提供更新方法
    return {
      // 只读数据访问
      playerData: readonly(playerData),
      isLoading: readonly(isLoading),
      error: readonly(error),
      
      // 数据管理方法
      loadPlayerData,
      refreshPlayerData,
      updatePlayerData,
      setPlayerData,
      
      // 操作方法，自动同步数据
      consumeItem,
      buyItem,      
    }
} 