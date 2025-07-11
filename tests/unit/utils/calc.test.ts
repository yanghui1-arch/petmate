import { describe, it, expect, beforeEach } from 'vitest'
import { calcNextExp, calcMaxAttribute, calcBuffEffect } from '../../../src/main/modules/utils/calc'
import { ActiveBuff, BuffEffect, DEFAULT_BUFF_EFFECT } from '../../../src/main/types/buff'

describe('Calc Utils', () => {
  describe('calcNextExp', () => {
    it('should calculate correct experience for level 1', () => {
      const result = calcNextExp(1)
      // baseRatio * currentLevel^incrementRatio + linearRatio * currentLevel
      // 50 * 1^1.7 + 100 * 1 = 50 + 100 = 150
      expect(result).toBe(150)
    })

    it('should calculate correct experience for level 5', () => {
      const result = calcNextExp(5)
      // 50 * 5^1.7 + 100 * 5 = 50 * 11.18 + 500 ≈ 559 + 500 = 1059
      const expected = Math.floor(50 * Math.pow(5, 1.7) + 100 * 5)
      expect(result).toBe(expected)
    })

    it('should calculate correct experience for level 10', () => {
      const result = calcNextExp(10)
      const expected = Math.floor(50 * Math.pow(10, 1.7) + 100 * 10)
      expect(result).toBe(expected)
    })

    it('should handle level 0 (edge case)', () => {
      const result = calcNextExp(0)
      const expected = Math.floor(50 * Math.pow(0, 1.7) + 100 * 0)
      expect(result).toBe(expected) // Should be 0
    })

    it('should increase exponentially with higher levels', () => {
      const level1 = calcNextExp(1)
      const level2 = calcNextExp(2)
      const level10 = calcNextExp(10)
      const level20 = calcNextExp(20)
      
      // Each level should require more experience than the previous
      expect(level2).toBeGreaterThan(level1)
      expect(level10).toBeGreaterThan(level2)
      expect(level20).toBeGreaterThan(level10)
      
      // The gap should increase (exponential growth)
      expect(level20 - level10).toBeGreaterThan(level10 - level2)
    })

    it('should always return positive integer values', () => {
      for (let level = 1; level <= 50; level++) {
        const result = calcNextExp(level)
        expect(result).toBeGreaterThan(0)
        expect(Number.isInteger(result)).toBe(true)
      }
    })
  })

  describe('calcMaxAttribute', () => {
    it('should calculate correct max attribute for level 1', () => {
      const result = calcMaxAttribute(1)
      // 100 * level = 100 * 1 = 100
      expect(result).toBe(100)
    })

    it('should calculate correct max attribute for level 5', () => {
      const result = calcMaxAttribute(5)
      expect(result).toBe(500)
    })

    it('should calculate correct max attribute for level 10', () => {
      const result = calcMaxAttribute(10)
      expect(result).toBe(1000)
    })

    it('should handle level 0 (edge case)', () => {
      const result = calcMaxAttribute(0)
      expect(result).toBe(0)
    })

    it('should scale linearly with level', () => {
      const level5 = calcMaxAttribute(5)
      const level10 = calcMaxAttribute(10)
      const level20 = calcMaxAttribute(20)
      
      // Should be exactly double for double the level
      expect(level10).toBe(level5 * 2)
      expect(level20).toBe(level10 * 2)
    })

    it('should always return integer values', () => {
      for (let level = 1; level <= 100; level++) {
        const result = calcMaxAttribute(level)
        expect(Number.isInteger(result)).toBe(true)
      }
    })
  })

  describe('calcBuffEffect', () => {
    let mockBuff: ActiveBuff
    let expiredBuff: ActiveBuff
    
    beforeEach(() => {
      // Create a mock active buff that is currently active
      const futureTime = new Date()
      futureTime.setHours(futureTime.getHours() + 1) // 1 hour in the future
      
      mockBuff = {
        id: 'test-buff-1',
        buff: {
          id: 1,
          name: 'Test Buff',
          description: 'A test buff',
          icon: 'test-icon',
          type: 'positive',
          duration: 3600,
          maxStack: 1,
          effect: {
            expGainRate: 1.5,
            gameExpGainRate: 1.2,
            singExpGainRate: 1.0,
            drawExpGainRate: 1.0,
            affectionExpGainRate: 1.0,
            energyCostRate: 0.8,
            hungryCostRate: 1.0,
            healthCostRate: 1.0,
            emotionCostRate: 1.0,
            cashCostRate: 1.0,
            energyGainRate: 1.3,
            hungryGainRate: 1.0,
            healthGainRate: 1.0,
            emotionGainRate: 1.0,
            spendingTimeRate: 1.0,
            cashGainRate: 1.1
          }
        },
        endTime: futureTime
      }

      // Create a mock expired buff
      const pastTime = new Date()
      pastTime.setHours(pastTime.getHours() - 1) // 1 hour in the past
      
      expiredBuff = {
        id: 'expired-buff',
        buff: {
          id: 2,
          name: 'Expired Buff',
          description: 'An expired buff',
          icon: 'expired-icon',
          type: 'positive',
          duration: 3600,
          maxStack: 1,
          effect: {
            expGainRate: 2.0,
            gameExpGainRate: 2.0,
            singExpGainRate: 2.0,
            drawExpGainRate: 2.0,
            affectionExpGainRate: 2.0,
            energyCostRate: 0.5,
            hungryCostRate: 0.5,
            healthCostRate: 0.5,
            emotionCostRate: 0.5,
            cashCostRate: 0.5,
            energyGainRate: 2.0,
            hungryGainRate: 2.0,
            healthGainRate: 2.0,
            emotionGainRate: 2.0,
            spendingTimeRate: 0.5,
            cashGainRate: 2.0
          }
        },
        endTime: pastTime
      }
    })

    it('should return default buff effect when no buffs are provided', () => {
      const result = calcBuffEffect([])
      expect(result).toEqual(DEFAULT_BUFF_EFFECT)
    })

    it('should apply single active buff correctly', () => {
      const result = calcBuffEffect([mockBuff])
      
      expect(result.expGainRate).toBe(1.5)
      expect(result.gameExpGainRate).toBe(1.2)
      expect(result.energyCostRate).toBe(0.8)
      expect(result.energyGainRate).toBe(1.3)
      expect(result.cashGainRate).toBe(1.1)
      
      // Properties not affected by the buff should remain at default
      expect(result.singExpGainRate).toBe(1.0)
      expect(result.hungryCostRate).toBe(1.0)
    })

    it('should ignore expired buffs', () => {
      const result = calcBuffEffect([expiredBuff])
      expect(result).toEqual(DEFAULT_BUFF_EFFECT)
    })

    it('should apply multiple buffs multiplicatively', () => {
      const secondBuff: ActiveBuff = {
        id: 'test-buff-2',
        buff: {
          id: 3,
          name: 'Second Test Buff',
          description: 'Another test buff',
          icon: 'test-icon-2',
          type: 'positive',
          duration: 3600,
          maxStack: 1,
          effect: {
            ...DEFAULT_BUFF_EFFECT,
            expGainRate: 1.2, // Will multiply with mockBuff's 1.5
            energyCostRate: 0.9 // Will multiply with mockBuff's 0.8
          }
        },
        endTime: new Date(Date.now() + 3600000) // 1 hour in future
      }

      const result = calcBuffEffect([mockBuff, secondBuff])
      
      // Effects should multiply: 1.5 * 1.2 = 1.8
      expect(result.expGainRate).toBe(1.8)
      // 0.8 * 0.9 = 0.72
      expect(result.energyCostRate).toBe(0.72)
      // Only one buff affects this, so should be 1.2
      expect(result.gameExpGainRate).toBe(1.2)
    })

    it('should handle mix of active and expired buffs', () => {
      const result = calcBuffEffect([mockBuff, expiredBuff])
      
      // Should only apply the active buff, ignoring the expired one
      expect(result.expGainRate).toBe(1.5)
      expect(result.gameExpGainRate).toBe(1.2)
      expect(result.energyCostRate).toBe(0.8)
    })

    it('should handle buffs with exactly current time as end time', () => {
      const exactTimeBuff: ActiveBuff = {
        ...mockBuff,
        id: 'exact-time-buff',
        endTime: new Date() // Exactly current time
      }
      
      const result = calcBuffEffect([exactTimeBuff])
      
      // Since endTime >= new Date(), it should still be active
      expect(result.expGainRate).toBe(1.5)
    })

    it('should preserve original DEFAULT_BUFF_EFFECT object', () => {
      const originalDefault = { ...DEFAULT_BUFF_EFFECT }
      calcBuffEffect([mockBuff])
      
      // DEFAULT_BUFF_EFFECT should not be modified
      expect(DEFAULT_BUFF_EFFECT).toEqual(originalDefault)
    })

    it('should handle negative buff effects', () => {
      const negativeBuff: ActiveBuff = {
        id: 'negative-buff',
        buff: {
          id: 4,
          name: 'Negative Buff',
          description: 'A debuff',
          icon: 'debuff-icon',
          type: 'negative',
          duration: 3600,
          maxStack: 1,
          effect: {
            ...DEFAULT_BUFF_EFFECT,
            expGainRate: 0.5, // Reduces experience gain
            energyCostRate: 1.5 // Increases energy cost
          }
        },
        endTime: new Date(Date.now() + 3600000)
      }

      const result = calcBuffEffect([negativeBuff])
      
      expect(result.expGainRate).toBe(0.5)
      expect(result.energyCostRate).toBe(1.5)
    })
  })
}) 