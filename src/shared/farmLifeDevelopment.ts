import type { FarmLifeData, FarmLifeKind, FarmLifeView } from './farmLife'

export const farmLifeDevelopmentEvents: Record<FarmLifeKind, string> = {
    water: '浇水',
    harvest: '收获',
    order: '订单备货',
    rest: '门口休息',
    butterfly: '水边看蝴蝶',
    seedlings: '看看菜苗',
    walk: '农场散步',
    check: '巡视农场',
    flower: '田边种花'
}

export const farmDevelopmentActions = {
    clearCrops: '铲除全部作物',
    addCoins: '金币 +1000',
    matureCrops: '全部作物成熟',
    resetQuota: '重置今日出行额度'
} as const
export type FarmDevelopmentAction = keyof typeof farmDevelopmentActions
export type FarmLifeDevelopmentCommand = 'trigger' | 'recall' | FarmDevelopmentAction

export type FarmLifeDevelopmentState = {
    life: FarmLifeView
    reason: string
    choices: { kind: FarmLifeKind; plotIds: number[] }[]
    daily: FarmLifeData['daily'] | null
    resources: { cash: number; planted: number }
    setupReason: string
}
