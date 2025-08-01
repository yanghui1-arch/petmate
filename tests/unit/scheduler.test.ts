import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { triggerWishGeneration, startWishGeneration, stopWishGeneration, generateWishForSelectedPetmate } from '../../src/main/scheduler'
import { playerManager } from '../../src/main/modules/store'
import { wishHandler } from '../../src/main/modules/wish'
import logger from '../../src/main/log'
import { WISH_GENERATE_INTERVAL } from '../../src/main/constant'

// Mock dependencies
vi.mock('../../src/main/modules/store', () => ({
  playerManager: {
    getPlayer: vi.fn(),
    updatePetmate: vi.fn()
  }
}))

vi.mock('../../src/main/modules/wish', () => ({
  wishHandler: {
    generateWish: vi.fn(() => {
      return {
        id: 'test-wish-id',
        name: 'Test Wish',
        status: 'doing',
        startTime: new Date(),
        duration: 3600,
        endTime: new Date(Date.now() + 3600000),
        affectionExp: 10,
        requirements: [],
        reward: undefined
      }
    })
  }
}))

vi.mock('../../src/main/log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('Scheduler Functions', () => {
  const mockPlayer = {
    name: '主人',
    petmates: [
			{
				id: 0,
				name: "Dass",
				attrs: {
					level: 3,
					exp: 138,
					next_exp: 623,
					game_level: 3,
					game_exp: 138,
					game_next_exp: 623,
					sing_level: 1,
					sing_exp: 0,
					sing_next_exp: 100,
					draw_level: 1,
					draw_exp: 0,
					draw_next_exp: 100,
					affection_level: 1,
					affection_exp: 0,
					affection_next_exp: 100,
					hungry: 110,
					emotion: 110,
					energy: 110,
					health: 110,
					max_hungry: 300,
					max_emotion: 300,
					max_energy: 300,
					max_health: 300,
					buffs: [],
					max_buffs: 10
				},
				status: {
					status: "idle"
				},
				wishes: [],
				completedWishesNum: 0,
        addWish: vi.fn()
			}
		],
    steam_id: null,
    qq: null,
    cash: 500,
    items: []
  }

  const mockWish = {
    id: 'test-wish-id',
    name: 'Test Wish',
    status: 'doing',
    startTime: new Date(),
    duration: 3600,
    endTime: new Date(Date.now() + 3600000),
    affectionExp: 10,
    requirements: [],
    reward: undefined
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(playerManager.getPlayer).mockReturnValue(mockPlayer as any)
    vi.mocked(wishHandler.generateWish).mockReturnValue(mockWish as any)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('应该能够手动触发愿望生成', () => {
    // 确保其一定可以触发生成愿望
    vi.spyOn(Math, "random").mockReturnValue(0.3)
    triggerWishGeneration(0)
    expect(playerManager.getPlayer).toHaveBeenCalled()
    expect(wishHandler.generateWish).toHaveBeenCalled()
    expect(mockPlayer.petmates[0].addWish).toHaveBeenCalledWith(mockWish)
    expect(playerManager.updatePetmate).toHaveBeenCalledWith(mockPlayer.petmates[0])
    expect(logger.info).toHaveBeenCalledWith('[scheduler] 手动触发愿望生成')
  })

  it('应该在愿望数量达到最大值时跳过生成', () => {
    // 模拟达到最大愿望数量
    const fullWishesPetmate = {
      ...mockPlayer.petmates[0],
      wishes: Array(10).fill(0).map((_, i) => ({
        id: `wish-${i}`,
        status: 'doing',
        name: `Wish ${i}`
      }))
    }

    vi.mocked(playerManager.getPlayer).mockReturnValue({
      ...mockPlayer,
      petmates: [fullWishesPetmate]
    } as any)

    triggerWishGeneration(0)

    expect(logger.warn).toHaveBeenCalledWith('[scheduler] Petmate Dass 的愿望数量已达到最大值')
    expect(wishHandler.generateWish).not.toHaveBeenCalled()
  })

  it('应该在petmate不存在时记录错误', () => {
    vi.mocked(playerManager.getPlayer).mockReturnValue({
      ...mockPlayer,
      petmates: []
    } as any)

    triggerWishGeneration(0)

    expect(logger.error).toHaveBeenCalledWith('[scheduler] 生成愿望失败: NotFoundError: 未找到ID为 0 的petmate')
  })

  it('应该正确记录生成成功的日志', () => {
    generateWishForSelectedPetmate(0)

    expect(logger.info).toHaveBeenCalledWith('[scheduler] 为 Dass 生成了新愿望: Test Wish')
  })

  it('应该能够启动和停止定时任务', () => {
    // 先停止可能已经运行的定时任务
    stopWishGeneration()

    // 启动定时任务
    startWishGeneration(0)
    expect(logger.info).toHaveBeenCalledWith(`[scheduler] 启动愿望生成定时任务，间隔: ${WISH_GENERATE_INTERVAL / 1000 / 60 / 60} 小时`)

    // 停止定时任务
    stopWishGeneration() 
    expect(logger.info).toHaveBeenCalledWith('[scheduler] 愿望生成定时任务已停止')
  })
}) 